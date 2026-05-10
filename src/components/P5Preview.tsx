import Sketch from 'react-p5';
import type p5 from 'react-p5/node_modules/@types/p5';
import type { Node } from '@xyflow/react';
import {NODE_TYPES, type BackgroundNodeData, type ImageNodeData, type NodeMetadata, type PageNodeData, type TextNodeData} from '../types/nodeTypes';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {toNumberOrNull} from '../utils/numberUtils.ts';
import {
  DEFAULT_LATEST_SELECTED_PAGE_NAME,
  getLatestSelectedPageNameFromSession,
  LATEST_SELECTED_PAGE_NAME_CHANGED_EVENT,
} from '../utils/sessionStorage.ts';
import {ensureProjectFontsLoaded, PROJECT_FONT_OPTIONS} from '../utils/fontRegistry.ts';

type P5BackgroundProps = {
  nodes: Node[];
};

type ImageMetadataWithImage = Partial<ImageNodeData> & {
  loadedImage: p5.Image | null;
};

type BackgroundRenderableImage = p5.Image | p5.Graphics;

type BackgroundMetadataWithImage = Partial<BackgroundNodeData> & {
  loadedImage: BackgroundRenderableImage | null;
  sourceImageData: Partial<ImageNodeData> | null;
  sourceType: typeof NODE_TYPES.IMAGE | typeof NODE_TYPES.TEXT | null;
};

type TextMetadata = Partial<TextNodeData>;

type DrawTask = (target: p5 | p5.Graphics, p5Instance: p5) => void;

type ProgressiveRenderState = {
  signature: string;
  tasks: DrawTask[];
  taskIndex: number;
};

const P5Preview = ({ nodes }: P5BackgroundProps) => {
  const p5InstanceRef = useRef<p5 | null>(null);
  const imageMetadataListRef = useRef<ImageMetadataWithImage[]>([]);
  const backgroundMetadataListRef = useRef<BackgroundMetadataWithImage[]>([]);
  const textMetadataListRef = useRef<TextMetadata[]>([]);
  const sceneBufferRef = useRef<p5.Graphics | null>(null);
  const renderSignatureRef = useRef('');
  const mousePointerRef = useRef<string | null>(null);
  const pageBackgroundColorRef = useRef('#ffffff');
  const hasLivePreviewRef = useRef(false);
  const imageCacheRef = useRef<Map<string, p5.Image>>(new Map());
  const lastRedrawAtRef = useRef(0);
  const pendingRedrawTimerRef = useRef<number | null>(null);
  const pendingPreviewLoadingTimerRef = useRef<number | null>(null);
  const previewLoadTokenRef = useRef(0);
  const pendingAssetLoadsRef = useRef(0);
  const hasDrawnForCurrentLoadRef = useRef(false);
  const isPreviewLoadingRef = useRef(true);
  const progressiveRenderRef = useRef<ProgressiveRenderState | null>(null);
  const tilePatternCanvasCacheRef = useRef<WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>>(new WeakMap());
  const [latestSelectedPageName, setLatestSelectedPageName] = useState(() => getLatestSelectedPageNameFromSession());
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [fontsReady, setFontsReady] = useState(PROJECT_FONT_OPTIONS.length === 0);

  const selectedPageNode = useMemo(() => {
    const pageNodes = nodes.filter(node => node.type === NODE_TYPES.PAGE);
    if (pageNodes.length === 0) {
      return undefined;
    }

    const selectedName = latestSelectedPageName.trim();
    if (selectedName && selectedName !== DEFAULT_LATEST_SELECTED_PAGE_NAME) {
      const matchingPageNode = pageNodes.find((node) => {
        const pageData = node.data as PageNodeData | undefined;
        return (pageData?.name ?? '').trim() === selectedName;
      });

      if (matchingPageNode) {
        return matchingPageNode;
      }
    }

    return pageNodes[0];
  }, [latestSelectedPageName, nodes]);
  const pageNodeData = selectedPageNode?.data as PageNodeData | undefined;
  const selectedPageNodeId = selectedPageNode?.id ?? null;

  const getPageDimensions = useCallback(() => {
    const width = toNumberOrNull(pageNodeData?.width);
    const height = toNumberOrNull(pageNodeData?.height);

    if (width !== null && height !== null) {
      return { width, height };
    }

    return null;
  }, [pageNodeData]);

  const setPreviewLoadingState = useCallback((nextValue: boolean) => {
    if (!nextValue && pendingPreviewLoadingTimerRef.current !== null) {
      window.clearTimeout(pendingPreviewLoadingTimerRef.current);
      pendingPreviewLoadingTimerRef.current = null;
    }
    if (isPreviewLoadingRef.current === nextValue) {
      return;
    }
    isPreviewLoadingRef.current = nextValue;
    setIsPreviewLoading(nextValue);
  }, []);

  useEffect(() => {
    const syncLatestSelectedPageName = () => {
      setLatestSelectedPageName(getLatestSelectedPageNameFromSession());
    };

    const onLatestSelectedPageNameChanged = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const pageName = customEvent.detail;

      if (typeof pageName === 'string' && pageName.trim()) {
        setLatestSelectedPageName(pageName);
        return;
      }

      syncLatestSelectedPageName();
    };

    window.addEventListener(LATEST_SELECTED_PAGE_NAME_CHANGED_EVENT, onLatestSelectedPageNameChanged);
    window.addEventListener('storage', syncLatestSelectedPageName);
    return () => {
      window.removeEventListener(LATEST_SELECTED_PAGE_NAME_CHANGED_EVENT, onLatestSelectedPageNameChanged);
      window.removeEventListener('storage', syncLatestSelectedPageName);
    };
  }, []);

  const loadCursorImage = (p5Instance: p5, mousePointer: string | null) => {
    if (!mousePointer) {
      p5Instance.cursor('default');
      return;
    }

    const imagePath = withCorsProxy(mousePointer);
    p5Instance.cursor(imagePath);
  };

  const requestRedraw = useCallback(() => {
    const p5Instance = p5InstanceRef.current;
    if (!p5Instance) {
      return;
    }
    if (hasLivePreviewRef.current) {
      return;
    }

    const minIntervalMs = 1000;
    const now = Date.now();
    const elapsed = now - lastRedrawAtRef.current;

    if (elapsed >= minIntervalMs) {
      if (pendingRedrawTimerRef.current !== null) {
        window.clearTimeout(pendingRedrawTimerRef.current);
        pendingRedrawTimerRef.current = null;
      }
      lastRedrawAtRef.current = now;
      p5Instance.redraw();
      return;
    }

    if (pendingRedrawTimerRef.current !== null) {
      return;
    }

    pendingRedrawTimerRef.current = window.setTimeout(() => {
      pendingRedrawTimerRef.current = null;
      lastRedrawAtRef.current = Date.now();
      p5InstanceRef.current?.redraw();
    }, minIntervalMs - elapsed);
  }, []);

  useEffect(() => {
    let isActive = true;

    void ensureProjectFontsLoaded().then(() => {
      if (!isActive) {
        return;
      }

      setFontsReady(true);
      renderSignatureRef.current = '';
      requestRedraw();
    });

    return () => {
      isActive = false;
    };
  }, [requestRedraw]);

  const maybeCompletePreviewLoad = useCallback((token: number) => {
    if (token !== previewLoadTokenRef.current) {
      return;
    }

    if (pendingAssetLoadsRef.current === 0
      && hasDrawnForCurrentLoadRef.current
      && progressiveRenderRef.current === null) {
      setPreviewLoadingState(false);
    }
  }, [setPreviewLoadingState]);

  const beginPreviewLoad = useCallback(() => {
    previewLoadTokenRef.current += 1;
    pendingAssetLoadsRef.current = 0;
    hasDrawnForCurrentLoadRef.current = false;
    lastRedrawAtRef.current = 0;
    progressiveRenderRef.current = null;
    renderSignatureRef.current = '';

    if (!isPreviewLoadingRef.current) {
      isPreviewLoadingRef.current = true;
      if (pendingPreviewLoadingTimerRef.current !== null) {
        window.clearTimeout(pendingPreviewLoadingTimerRef.current);
      }
      pendingPreviewLoadingTimerRef.current = window.setTimeout(() => {
        pendingPreviewLoadingTimerRef.current = null;
        setIsPreviewLoading(true);
      }, 0);
    }
  }, []);

  useEffect(() => {
    beginPreviewLoad();
  }, [beginPreviewLoad, selectedPageNodeId]);

  useEffect(() => {
    if (pageNodeData && p5InstanceRef.current) {
      const hydrateStart = performance.now();
      const currentLoadToken = previewLoadTokenRef.current;
      const pageData = pageNodeData;
      const imageNodesMetadata = pageData.metadata?.sourceNodes.filter(
        source => source.type === NODE_TYPES.IMAGE
      ) || [];
      const backgroundNodesMetadata = pageData.metadata?.sourceNodes.filter(
        source => source.type === NODE_TYPES.BACKGROUND
      ) || [];
      const textNodesMetadata = pageData.metadata?.sourceNodes.filter(
        source => source.type === NODE_TYPES.TEXT
      ) || [];
      mousePointerRef.current = (pageData.mousePointer ?? (pageData as PageNodeData & {mouse?: string}).mouse)?.trim() || null;
      pageBackgroundColorRef.current = resolvePageBackgroundColor(pageData.backgroundColor);

      const newImageMetadataList: ImageMetadataWithImage[] = [];
      const newBackgroundMetadataList: BackgroundMetadataWithImage[] = [];
      const newTextMetadataList: TextMetadata[] = [];

      releaseTextBackgroundSurfaces(backgroundMetadataListRef.current);

      imageNodesMetadata.forEach(imageNodeMetadata => {
        if (!imageNodeMetadata?.data) {
          return;
        }

        const newImageData = imageNodeMetadata.data as Partial<ImageNodeData>;
        let loadedImage: p5.Image | null = null;
        const imageSourcePath = getImageSourcePath(newImageData);

        if (imageSourcePath && p5InstanceRef.current) {
          const imagePath = withCorsProxy(imageSourcePath);
          const cachedImage = imageCacheRef.current.get(imagePath);
          if (cachedImage) {
            loadedImage = cachedImage;
          } else {
            pendingAssetLoadsRef.current += 1;
            loadedImage = p5InstanceRef.current.loadImage(imagePath, (img) => {
              if (currentLoadToken !== previewLoadTokenRef.current) {
                return;
              }
              imageCacheRef.current.set(imagePath, img);
              pendingAssetLoadsRef.current = Math.max(0, pendingAssetLoadsRef.current - 1);
              requestRedraw();
              maybeCompletePreviewLoad(currentLoadToken);
            }, () => {
              if (currentLoadToken !== previewLoadTokenRef.current) {
                return;
              }
              pendingAssetLoadsRef.current = Math.max(0, pendingAssetLoadsRef.current - 1);
              requestRedraw();
              maybeCompletePreviewLoad(currentLoadToken);
            });
          }
        }

        newImageMetadataList.push({
          ...newImageData,
          loadedImage,
        });
      });

      backgroundNodesMetadata.forEach(backgroundNodeMetadata => {
        if (!backgroundNodeMetadata?.data) {
          return;
        }

        const backgroundData = backgroundNodeMetadata.data as Partial<BackgroundNodeData> & {metadata?: NodeMetadata};
        const sourceImageMetadata = backgroundData.metadata?.sourceNodes.find(
          source => source.type === NODE_TYPES.IMAGE
        );
        const sourceTextMetadata = sourceImageMetadata
          ? undefined
          : backgroundData.metadata?.sourceNodes.find(
            source => source.type === NODE_TYPES.TEXT
          );

        const sourceImageData = (sourceImageMetadata?.data ?? sourceTextMetadata?.data ?? null) as Partial<ImageNodeData> | null;

        let sourceType: typeof NODE_TYPES.IMAGE | typeof NODE_TYPES.TEXT | null = null;
        let loadedImage: BackgroundRenderableImage | null = null;
        const sourceImagePath = getImageSourcePath(sourceImageData);

        if (sourceImageMetadata && sourceImagePath && p5InstanceRef.current) {
          sourceType = NODE_TYPES.IMAGE;
          const imagePath = withCorsProxy(sourceImagePath);
          const cachedImage = imageCacheRef.current.get(imagePath);
          if (cachedImage) {
            loadedImage = cachedImage;
          } else {
            pendingAssetLoadsRef.current += 1;
            loadedImage = p5InstanceRef.current.loadImage(imagePath, (img) => {
              if (currentLoadToken !== previewLoadTokenRef.current) {
                return;
              }
              imageCacheRef.current.set(imagePath, img);
              pendingAssetLoadsRef.current = Math.max(0, pendingAssetLoadsRef.current - 1);
              requestRedraw();
              maybeCompletePreviewLoad(currentLoadToken);
            }, () => {
              if (currentLoadToken !== previewLoadTokenRef.current) {
                return;
              }
              pendingAssetLoadsRef.current = Math.max(0, pendingAssetLoadsRef.current - 1);
              requestRedraw();
              maybeCompletePreviewLoad(currentLoadToken);
            });
          }
        } else if (sourceTextMetadata && p5InstanceRef.current) {
          sourceType = NODE_TYPES.TEXT;
          const sourceTextData = sourceTextMetadata.data as Partial<TextNodeData>;
          loadedImage = createTextSurfaceImage(p5InstanceRef.current, sourceTextData);
        }

        newBackgroundMetadataList.push({
          ...backgroundData,
          loadedImage,
          sourceImageData,
          sourceType,
        });
      });

      textNodesMetadata.forEach(textNodeMetadata => {
        if (!textNodeMetadata?.data) {
          return;
        }
        newTextMetadataList.push(textNodeMetadata.data as TextMetadata);
      });

      imageMetadataListRef.current = newImageMetadataList;
      backgroundMetadataListRef.current = newBackgroundMetadataList;
      textMetadataListRef.current = newTextMetadataList;
      const hasLivePreview = isGifPath(mousePointerRef.current)
        || newImageMetadataList.some(image => isGifPath(getImageSourcePath(image)))
        || newBackgroundMetadataList.some(background => isGifPath(getImageSourcePath(background.sourceImageData)));
      hasLivePreviewRef.current = hasLivePreview;

      if (hasLivePreview) {
        if (pendingRedrawTimerRef.current !== null) {
          window.clearTimeout(pendingRedrawTimerRef.current);
          pendingRedrawTimerRef.current = null;
        }
        if (sceneBufferRef.current) {
          sceneBufferRef.current.remove();
          sceneBufferRef.current = null;
        }
        renderSignatureRef.current = '';
        p5InstanceRef.current.frameRate(30);
        p5InstanceRef.current.loop();
      } else {
        p5InstanceRef.current.noLoop();
        requestRedraw();
      }
      logPreviewTiming('hydrate-page-metadata', hydrateStart, {
        imageSources: imageNodesMetadata.length,
        backgroundSources: backgroundNodesMetadata.length,
        textSources: textNodesMetadata.length,
        pendingAssetLoads: pendingAssetLoadsRef.current,
      });
      maybeCompletePreviewLoad(currentLoadToken);
    } else {
      releaseTextBackgroundSurfaces(backgroundMetadataListRef.current);
      imageMetadataListRef.current = [];
      backgroundMetadataListRef.current = [];
      textMetadataListRef.current = [];
      pageBackgroundColorRef.current = '#ffffff';
      hasLivePreviewRef.current = false;
      if (p5InstanceRef.current) {
        p5InstanceRef.current.cursor('default');
        p5InstanceRef.current.noLoop();
        requestRedraw();
      }
      maybeCompletePreviewLoad(previewLoadTokenRef.current);
    }
  }, [fontsReady, maybeCompletePreviewLoad, pageNodeData, requestRedraw]);

  useEffect(() => {
    return () => {
      if (pendingRedrawTimerRef.current !== null) {
        window.clearTimeout(pendingRedrawTimerRef.current);
        pendingRedrawTimerRef.current = null;
      }
      if (pendingPreviewLoadingTimerRef.current !== null) {
        window.clearTimeout(pendingPreviewLoadingTimerRef.current);
        pendingPreviewLoadingTimerRef.current = null;
      }
      releaseTextBackgroundSurfaces(backgroundMetadataListRef.current);
      sceneBufferRef.current?.remove();
      sceneBufferRef.current = null;
      progressiveRenderRef.current = null;
      tilePatternCanvasCacheRef.current = new WeakMap();
    };
  }, []);

  useEffect(() => {
    if (!p5InstanceRef.current) return;

    const dimensions = getPageDimensions();
    if (dimensions) {
      p5InstanceRef.current.resizeCanvas(dimensions.width, dimensions.height);
    } else {
      p5InstanceRef.current.resizeCanvas(
        p5InstanceRef.current.windowWidth,
        p5InstanceRef.current.windowHeight
      );
    }

    requestRedraw();
  }, [getPageDimensions, pageNodeData?.width, pageNodeData?.height, requestRedraw]);

  const setup = (p5Instance: p5, canvasParentRef: Element) => {
    const dimensions = getPageDimensions();
    const renderer = dimensions
      ? p5Instance.createCanvas(dimensions.width, dimensions.height)
      : p5Instance.createCanvas(p5Instance.windowWidth, p5Instance.windowHeight);

    renderer.parent(canvasParentRef);
    const canvasEl = (renderer as unknown as { elt?: Element }).elt;
    if (canvasEl instanceof HTMLCanvasElement) {
      canvasEl.id = 'p5-background-canvas';
    }

    p5InstanceRef.current = p5Instance;
    if (hasLivePreviewRef.current) {
      p5Instance.frameRate(30);
      p5Instance.loop();
    } else {
      p5Instance.noLoop();
      requestRedraw();
    }
  };

  const draw = (p5Instance: p5) => {
    loadCursorImage(p5Instance, mousePointerRef.current);

    if (hasLivePreviewRef.current) {
      const liveStart = performance.now();
      p5Instance.background(pageBackgroundColorRef.current);
      const liveTasks = createSceneDrawTasks({
        p5Instance,
        backgrounds: backgroundMetadataListRef.current,
        images: imageMetadataListRef.current,
        texts: textMetadataListRef.current,
        tilePatternCanvasCache: tilePatternCanvasCacheRef.current,
      });
      liveTasks.forEach((task) => task(p5Instance, p5Instance));
      logPreviewTiming('draw-live-scene', liveStart, { tasks: liveTasks.length });
      hasDrawnForCurrentLoadRef.current = true;
      maybeCompletePreviewLoad(previewLoadTokenRef.current);
      return;
    }

    const signatureStart = performance.now();
    const signature = createRenderSignature(
      p5Instance.width,
      p5Instance.height,
      pageBackgroundColorRef.current,
      backgroundMetadataListRef.current,
      imageMetadataListRef.current,
      textMetadataListRef.current
    );
    logPreviewTiming('draw-signature', signatureStart);

    if (!sceneBufferRef.current || renderSignatureRef.current !== signature) {
      const setupStart = performance.now();
      renderSignatureRef.current = signature;

      if (sceneBufferRef.current) {
        sceneBufferRef.current.remove();
      }

      sceneBufferRef.current = p5Instance.createGraphics(p5Instance.width, p5Instance.height);
      const scene = sceneBufferRef.current;
      scene.background(pageBackgroundColorRef.current);

      const tasks = createSceneDrawTasks({
        p5Instance,
        backgrounds: backgroundMetadataListRef.current,
        images: imageMetadataListRef.current,
        texts: textMetadataListRef.current,
        tilePatternCanvasCache: tilePatternCanvasCacheRef.current,
      });
      const estimatedComplexity = estimateSceneComplexity(
        backgroundMetadataListRef.current,
        textMetadataListRef.current,
        p5Instance.width,
        p5Instance.height
      );

      if (estimatedComplexity > 4000 || tasks.length > 150) {
        progressiveRenderRef.current = {
          signature,
          tasks,
          taskIndex: 0,
        };
      } else {
        tasks.forEach((task) => task(scene, p5Instance));
        progressiveRenderRef.current = null;
      }
      logPreviewTiming('draw-setup-scene', setupStart, {
        tasks: tasks.length,
        complexity: estimatedComplexity,
        progressive: Boolean(progressiveRenderRef.current),
      });
    }

    const progressiveState = progressiveRenderRef.current;
    if (sceneBufferRef.current && progressiveState && progressiveState.signature === signature) {
      const progressiveStart = performance.now();
      const nextIndex = runProgressiveRenderStep(
        progressiveState.tasks,
        progressiveState.taskIndex,
        sceneBufferRef.current,
        p5Instance,
        7
      );
      progressiveState.taskIndex = nextIndex;
      if (nextIndex >= progressiveState.tasks.length) {
        progressiveRenderRef.current = null;
        p5Instance.noLoop();
      } else {
        p5Instance.loop();
      }
      logPreviewTiming('draw-progressive-step', progressiveStart, {
        stepTaskIndex: nextIndex,
        totalTasks: progressiveState.tasks.length,
      });
    }

    p5Instance.background(pageBackgroundColorRef.current);
    if (sceneBufferRef.current) {
      p5Instance.image(sceneBufferRef.current, 0, 0);
    }

    hasDrawnForCurrentLoadRef.current = true;
    maybeCompletePreviewLoad(previewLoadTokenRef.current);
  };

  const windowResized = (p5Instance: p5) => {
    const dimensions = getPageDimensions();
    if (dimensions) {
      p5Instance.resizeCanvas(dimensions.width, dimensions.height);
    } else {
      p5Instance.resizeCanvas(p5Instance.windowWidth, p5Instance.windowHeight);
    }

    requestRedraw();
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      pointerEvents: 'none'
    }}>
      <Sketch setup={setup} draw={draw} windowResized={windowResized} />
      {isPreviewLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(0, 0, 0, 0.6)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              borderRadius: '8px',
              padding: '10px 14px',
            }}
          >
            <span className="loading-spinner" aria-hidden="true" />
            <span>Loading page preview...</span>
          </div>
        </div>
      )}
    </div>
  );
};

const createSceneDrawTasks = ({
  p5Instance,
  backgrounds,
  images,
  texts,
  tilePatternCanvasCache,
}: {
  p5Instance: p5;
  backgrounds: BackgroundMetadataWithImage[];
  images: ImageMetadataWithImage[];
  texts: TextMetadata[];
  tilePatternCanvasCache: WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>;
}) => {
  const tasks: DrawTask[] = [];

  backgrounds.forEach((backgroundData) => {
    if (!backgroundData.loadedImage || backgroundData.loadedImage.width <= 0 || !backgroundData.sourceImageData) {
      return;
    }

    const loadedImage = backgroundData.loadedImage;
    const sourceImageData = backgroundData.sourceImageData;
    const imageWidth = resolveDimension(
      sourceImageData.width,
      sourceImageData.autoWidth,
      loadedImage.width,
      100
    );
    const imageHeight = resolveDimension(
      sourceImageData.height,
      sourceImageData.autoHeight,
      loadedImage.height,
      100
    );

    if (imageWidth <= 0 || imageHeight <= 0) {
      return;
    }

    const style = backgroundData.style ?? 'tile';
    const surfaceWidth = resolveSurfaceDimension(backgroundData.width, backgroundData.autoWidth, p5Instance.width);
    const surfaceHeight = resolveSurfaceDimension(backgroundData.height, backgroundData.autoHeight, p5Instance.height);
    const opacity = clamp(toNumberOrNull(sourceImageData.opacity) ?? 1, 0, 1);
    const canUsePatternFill = !isGifPath(getImageSourcePath(sourceImageData));

    if (style === 'tile') {
      tasks.push((target) => {
        if (canUsePatternFill && drawTiledBackgroundWithPattern(
          target,
          loadedImage as p5.Image,
          imageWidth,
          imageHeight,
          surfaceWidth,
          surfaceHeight,
          opacity,
          tilePatternCanvasCache
        )) {
          return;
        }

        target.push();
        target.tint(255, opacity * 255);
        for (let y = 0; y < surfaceHeight; y += imageHeight) {
          for (let x = 0; x < surfaceWidth; x += imageWidth) {
            target.image(loadedImage as p5.Image, x, y, imageWidth, imageHeight);
          }
        }
        target.pop();
      });
      return;
    }

    if (style === 'fullscreen') {
      tasks.push((target) => {
        const coverRect = resolveCoverRect(
          loadedImage.width,
          loadedImage.height,
          target.width,
          target.height
        );
        if (!coverRect) {
          return;
        }

        target.push();
        target.tint(255, opacity * 255);
        target.image(
          loadedImage as p5.Image,
          coverRect.x,
          coverRect.y,
          coverRect.width,
          coverRect.height
        );
        target.pop();
      });
      return;
    }

    const positionX = toNumberOrNull(sourceImageData.positionX) ?? p5Instance.width / 2;
    const positionY = toNumberOrNull(sourceImageData.positionY) ?? p5Instance.height / 2;
    tasks.push((target) => {
      target.push();
      target.tint(255, opacity * 255);
      target.image(loadedImage as p5.Image, positionX, positionY, imageWidth, imageHeight);
      target.pop();
    });
  });

  images.forEach((imageData) => {
    if (!imageData.loadedImage || imageData.loadedImage.width <= 0) {
      return;
    }

    const width = resolveDimension(imageData.width, imageData.autoWidth, imageData.loadedImage.width, 100);
    const height = resolveDimension(imageData.height, imageData.autoHeight, imageData.loadedImage.height, 100);
    const positionX = toNumberOrNull(imageData.positionX) ?? p5Instance.width / 2;
    const positionY = toNumberOrNull(imageData.positionY) ?? p5Instance.height / 2;
    const opacity = clamp(toNumberOrNull(imageData.opacity) ?? 1, 0, 1);

    tasks.push((target) => {
      target.push();
      target.tint(255, opacity * 255);
      target.image(imageData.loadedImage as p5.Image, positionX, positionY, width, height);
      target.pop();
    });
  });

  texts.forEach((textData) => {
    const rawText = typeof textData.text === 'string' ? textData.text : '';
    if (!rawText.trim()) {
      return;
    }

    const textValue = toBoolean(textData.caps) ? rawText.toUpperCase() : rawText;
    const size = Math.max(1, toNumberOrNull(textData.size) ?? 16);
    const width = Math.max(0, toNumberOrNull(textData.width) ?? 250);
    const height = Math.max(0, toNumberOrNull(textData.height) ?? 120);
    if (width <= 0 || height <= 0) {
      return;
    }

    const positionX = toNumberOrNull(textData.positionX) ?? 0;
    const positionY = toNumberOrNull(textData.positionY) ?? 0;
    const opacity = clamp(toNumberOrNull(textData.opacity) ?? 1, 0, 1);
    const color = resolveTextColor(textData.color);
    const backgroundColor = resolveTextColor(textData.backgroundColor, '#ffffff');
    const transparentBackground = textData.transparentBackground !== false;
    const align = resolveTextAlign(textData.align);

    tasks.push((target) => {
      drawTextWithDecorations(target, p5Instance, {
        text: textValue,
        font: typeof textData.font === 'string' && textData.font.trim() ? textData.font : 'sans-serif',
        size,
        x: positionX,
        y: positionY,
        width,
        height,
        opacity,
        color,
        backgroundColor,
        transparentBackground,
        align,
        bold: toBoolean(textData.bold),
        italic: toBoolean(textData.italic),
        underline: toBoolean(textData.underline),
        strikethrough: toBoolean(textData.strikethrough),
      });
    });
  });

  return tasks;
};

const drawTiledBackgroundWithPattern = (
  target: p5 | p5.Graphics,
  image: p5.Image,
  tileWidth: number,
  tileHeight: number,
  surfaceWidth: number,
  surfaceHeight: number,
  opacity: number,
  tilePatternCanvasCache: WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>
) => {
  const drawingContext = (target as unknown as {drawingContext?: CanvasRenderingContext2D}).drawingContext;
  if (!drawingContext || !(drawingContext instanceof CanvasRenderingContext2D)) {
    return false;
  }

  const imageCanvas = (image as unknown as {canvas?: HTMLCanvasElement}).canvas;
  if (!imageCanvas || tileWidth <= 0 || tileHeight <= 0) {
    return false;
  }

  const cacheKey = `${Math.round(tileWidth)}x${Math.round(tileHeight)}`;
  let perImageCache = tilePatternCanvasCache.get(imageCanvas);
  if (!perImageCache) {
    perImageCache = new Map();
    tilePatternCanvasCache.set(imageCanvas, perImageCache);
  }
  let tileCanvas = perImageCache.get(cacheKey);
  if (!tileCanvas) {
    if (typeof document === 'undefined') {
      return false;
    }
    tileCanvas = document.createElement('canvas');
    tileCanvas.width = Math.max(1, Math.round(tileWidth));
    tileCanvas.height = Math.max(1, Math.round(tileHeight));
    const tileContext = tileCanvas.getContext('2d');
    if (!tileContext) {
      return false;
    }
    tileContext.clearRect(0, 0, tileCanvas.width, tileCanvas.height);
    tileContext.drawImage(imageCanvas, 0, 0, tileCanvas.width, tileCanvas.height);
    perImageCache.set(cacheKey, tileCanvas);
  }

  const pattern = drawingContext.createPattern(tileCanvas, 'repeat');
  if (!pattern) {
    return false;
  }

  drawingContext.save();
  drawingContext.globalAlpha *= opacity;
  drawingContext.fillStyle = pattern;
  drawingContext.fillRect(0, 0, surfaceWidth, surfaceHeight);
  drawingContext.restore();
  return true;
};

const resolveCoverRect = (
  sourceWidth: number,
  sourceHeight: number,
  containerWidth: number,
  containerHeight: number
) => {
  if (sourceWidth <= 0 || sourceHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return null;
  }

  const scale = Math.max(containerWidth / sourceWidth, containerHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
};

const runProgressiveRenderStep = (
  tasks: DrawTask[],
  startIndex: number,
  target: p5.Graphics,
  p5Instance: p5,
  budgetMs: number
) => {
  const start = performance.now();
  let index = startIndex;
  while (index < tasks.length && (performance.now() - start) < budgetMs) {
    tasks[index](target, p5Instance);
    index += 1;
  }
  return index;
};

const estimateSceneComplexity = (
  backgrounds: BackgroundMetadataWithImage[],
  texts: TextMetadata[],
  canvasWidth: number,
  canvasHeight: number
) => {
  let complexity = 0;
  backgrounds.forEach((backgroundData) => {
    if (!backgroundData.loadedImage || !backgroundData.sourceImageData) {
      return;
    }
    const sourceImageData = backgroundData.sourceImageData;
    const imageWidth = Math.max(1, resolveDimension(
      sourceImageData.width,
      sourceImageData.autoWidth,
      backgroundData.loadedImage.width,
      100
    ));
    const imageHeight = Math.max(1, resolveDimension(
      sourceImageData.height,
      sourceImageData.autoHeight,
      backgroundData.loadedImage.height,
      100
    ));
    const style = backgroundData.style ?? 'tile';
    if (style !== 'tile') {
      complexity += 1;
      return;
    }
    const surfaceWidth = resolveSurfaceDimension(backgroundData.width, backgroundData.autoWidth, canvasWidth);
    const surfaceHeight = resolveSurfaceDimension(backgroundData.height, backgroundData.autoHeight, canvasHeight);
    complexity += Math.ceil(surfaceWidth / imageWidth) * Math.ceil(surfaceHeight / imageHeight);
  });

  texts.forEach((textData) => {
    const textValue = typeof textData.text === 'string' ? textData.text : '';
    complexity += Math.max(1, Math.ceil(textValue.length / 30));
  });

  return complexity;
};

const shouldProfilePreview = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  return Boolean((window as Window & {__IMYWIS_PREVIEW_PROFILE?: boolean}).__IMYWIS_PREVIEW_PROFILE);
};

const logPreviewTiming = (_label: string, startedAt: number, details?: Record<string, unknown>) => {
  const duration = performance.now() - startedAt;
  if (!shouldProfilePreview() && duration < 24) {
    return;
  }
  if (details) {
    // console.debug(`[P5Preview] ${label}: ${duration.toFixed(1)}ms`, details);
    return;
  }
  // console.debug(`[P5Preview] ${label}: ${duration.toFixed(1)}ms`);
};

const getImageSourcePath = (data: Partial<ImageNodeData> | null | undefined) => {
  if (!data) {
    return null;
  }

  if (typeof data.localImageDataUrl === 'string' && data.localImageDataUrl.trim()) {
    return data.localImageDataUrl.trim();
  }

  if (typeof data.path === 'string' && data.path.trim()) {
    const trimmedPath = data.path.trim();
    if (trimmedPath.startsWith('local:')) {
      return null;
    }
    return trimmedPath;
  }

  return null;
};

const withCorsProxy = (path: string) =>
  path.startsWith('http')
    ? `https://corsproxy.io/?key=80b6bad2&url=${encodeURIComponent(path)}`
    : path;

const isGifPath = (path: unknown) => typeof path === 'string'
  && (
    /^data:image\/gif(?:;|,)/i.test(path.trim())
    || /\.gif(?:$|[?#])/i.test(path.trim())
  );

const toBoolean = (value: unknown) => value === true || value === 'true';

const releaseTextBackgroundSurfaces = (backgrounds: BackgroundMetadataWithImage[]) => {
  backgrounds.forEach((background) => {
    if (background.sourceType !== NODE_TYPES.TEXT || !background.loadedImage) {
      return;
    }
    const renderable = background.loadedImage as p5.Graphics & {remove?: () => void};
    renderable.remove?.();
  });
};

const createTextSurfaceImage = (
  p5Instance: p5,
  textData: Partial<TextNodeData>
): p5.Graphics | null => {
  const rawText = typeof textData.text === 'string' ? textData.text : '';
  if (!rawText.trim()) {
    return null;
  }

  const textValue = toBoolean(textData.caps) ? rawText.toUpperCase() : rawText;
  const size = Math.max(1, toNumberOrNull(textData.size) ?? 16);
  const width = Math.max(1, toNumberOrNull(textData.width) ?? 250);
  const height = Math.max(1, toNumberOrNull(textData.height) ?? 120);
  const opacity = clamp(toNumberOrNull(textData.opacity) ?? 1, 0, 1);
  const color = resolveTextColor(textData.color);
  const backgroundColor = resolveTextColor(textData.backgroundColor, '#ffffff');
  const transparentBackground = textData.transparentBackground !== false;
  const align = resolveTextAlign(textData.align);

  const surface = p5Instance.createGraphics(width, height);
  surface.clear(0, 0, 0, 0);

  drawTextWithDecorations(surface, p5Instance, {
    text: textValue,
    font: typeof textData.font === 'string' && textData.font.trim() ? textData.font : 'sans-serif',
    size,
    x: 0,
    y: 0,
    width,
    height,
    opacity,
    color,
    backgroundColor,
    transparentBackground,
    align,
    bold: toBoolean(textData.bold),
    italic: toBoolean(textData.italic),
    underline: toBoolean(textData.underline),
    strikethrough: toBoolean(textData.strikethrough),
  });

  return surface;
};

const resolveDimension = (
  configuredSize: unknown,
  autoSize: unknown,
  naturalSize: number,
  fallback: number
) => {
  if (toBoolean(autoSize)) {
    return naturalSize;
  }
  return toNumberOrNull(configuredSize) ?? fallback;
};

const resolveSurfaceDimension = (configuredSize: unknown, autoSize: unknown, fallback: number) => {
  if (toBoolean(autoSize)) {
    return fallback;
  }
  return toNumberOrNull(configuredSize) ?? fallback;
};

const createRenderSignature = (
  canvasWidth: number,
  canvasHeight: number,
  pageBackgroundColor: string,
  backgrounds: BackgroundMetadataWithImage[],
  images: ImageMetadataWithImage[],
  texts: TextMetadata[]
) => {
  const backgroundSignature = backgrounds.map(item => ({
    style: item.style ?? 'tile',
    width: item.width ?? null,
    height: item.height ?? null,
    autoWidth: item.autoWidth ?? false,
    autoHeight: item.autoHeight ?? false,
    loadedImageWidth: item.loadedImage?.width ?? 0,
    loadedImageHeight: item.loadedImage?.height ?? 0,
    sourceImageData: item.sourceImageData ?? null,
  }));

  const imageSignature = images.map(item => ({
    path: getImageSourcePath(item) ?? '',
    width: item.width ?? null,
    height: item.height ?? null,
    autoWidth: item.autoWidth ?? false,
    autoHeight: item.autoHeight ?? false,
    positionX: item.positionX ?? null,
    positionY: item.positionY ?? null,
    opacity: item.opacity ?? null,
    loadedImageWidth: item.loadedImage?.width ?? 0,
    loadedImageHeight: item.loadedImage?.height ?? 0,
  }));

  const textSignature = texts.map(item => ({
    text: item.text ?? '',
    font: item.font ?? 'sans-serif',
    size: item.size ?? null,
    width: item.width ?? null,
    height: item.height ?? null,
    positionX: item.positionX ?? null,
    positionY: item.positionY ?? null,
    opacity: item.opacity ?? null,
    color: item.color ?? '#000000',
    backgroundColor: item.backgroundColor ?? '#ffffff',
    transparentBackground: item.transparentBackground ?? true,
    align: item.align ?? 'left',
    bold: item.bold ?? false,
    italic: item.italic ?? false,
    underline: item.underline ?? false,
    strikethrough: item.strikethrough ?? false,
    caps: item.caps ?? false,
  }));

  return JSON.stringify({
    canvasWidth,
    canvasHeight,
    pageBackgroundColor,
    backgrounds: backgroundSignature,
    images: imageSignature,
    texts: textSignature,
  });
};

const drawTextWithDecorations = (
  target: p5 | p5.Graphics,
  p5Instance: p5,
  options: {
    text: string;
    font: string;
    size: number;
    x: number;
    y: number;
    width: number;
    height: number;
    opacity: number;
    color: string;
    backgroundColor: string;
    transparentBackground: boolean;
    align: 'left' | 'right' | 'center';
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
  }
) => {
  const {
    text,
    font,
    size,
    x,
    y,
    width,
    height,
    opacity,
    color,
    backgroundColor,
    transparentBackground,
    align,
    bold,
    italic,
    underline,
    strikethrough
  } = options;

  target.push();
  target.textFont(font);
  target.textSize(size);
  if (bold && italic) {
    target.textStyle(p5Instance.BOLDITALIC);
  } else if (bold) {
    target.textStyle(p5Instance.BOLD);
  } else if (italic) {
    target.textStyle(p5Instance.ITALIC);
  } else {
    target.textStyle(p5Instance.NORMAL);
  }

  const alpha = clamp(Math.round(opacity * 255), 0, 255);
  const textColor = p5Instance.color(color);
  textColor.setAlpha(alpha);
  if (!transparentBackground) {
    const textBackgroundColor = p5Instance.color(backgroundColor);
    textBackgroundColor.setAlpha(alpha);
    target.noStroke();
    target.fill(textBackgroundColor);
    target.rect(x, y, width, height);
  }

  target.noStroke();
  target.fill(textColor);

  const lines = wrapTextLines(target, text, width);
  const lineHeight = size * 1.2;
  const maxLines = Math.max(1, Math.floor(height / lineHeight));
  const visibleLineCount = Math.min(lines.length, maxLines);

  for (let index = 0; index < visibleLineCount; index += 1) {
    const lineData = lines[index];
    const line = lineData.text;
    const lineY = y + (index * lineHeight);
    let lineStartX = x;
    let lineEndX = x + target.textWidth(line);
    const alignmentMode = resolveP5TextAlign(p5Instance, align);
    target.textAlign(alignmentMode, p5Instance.TOP);
    const lineWidth = target.textWidth(line);
    if (align === 'center') {
      lineStartX = x + ((width - lineWidth) / 2);
    } else if (align === 'right') {
      lineStartX = x + width - lineWidth;
    }
    lineEndX = lineStartX + lineWidth;
    const textX = align === 'center'
      ? x + (width / 2)
      : align === 'right'
        ? x + width
        : x;
    target.text(line, textX, lineY);

    if (underline || strikethrough) {
      target.push();
      target.stroke(textColor);
      target.strokeWeight(Math.max(1, size * 0.06));
      if (underline) {
        target.line(lineStartX, lineY + size * 1.05, lineEndX, lineY + size * 1.05);
      }
      if (strikethrough) {
        target.line(lineStartX, lineY + size * 0.55, lineEndX, lineY + size * 0.55);
      }
      target.pop();
    }
  }

  target.pop();
};

const wrapTextLines = (target: p5 | p5.Graphics, text: string, maxWidth: number) => {
  const paragraphs = text.split('\n');
  const lines: Array<{text: string; isLastInParagraph: boolean}> = [];

  paragraphs.forEach(paragraph => {
    if (!paragraph.trim()) {
      lines.push({text: '', isLastInParagraph: true});
      return;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = '';

    words.forEach(word => {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (target.textWidth(candidate) <= maxWidth || !currentLine) {
        currentLine = candidate;
        return;
      }

      lines.push({text: currentLine, isLastInParagraph: false});
      currentLine = word;
    });

    if (currentLine) {
      lines.push({text: currentLine, isLastInParagraph: true});
    }
  });

  return lines;
};

const resolveTextAlign = (value: unknown): 'left' | 'right' | 'center' => {
  if (value === 'left' || value === 'right' || value === 'center') {
    return value;
  }
  return 'left';
};

const resolveP5TextAlign = (p5Instance: p5, align: 'left' | 'right' | 'center') => {
  if (align === 'center') {
    return p5Instance.CENTER;
  }
  if (align === 'right') {
    return p5Instance.RIGHT;
  }
  return p5Instance.LEFT;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const resolveTextColor = (value: unknown, fallback = '#000000') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(trimmed) ? trimmed : fallback;
};

const resolvePageBackgroundColor = (value: unknown) => {
  if (typeof value !== 'string') {
    return '#ffffff';
  }

  const trimmed = value.trim();
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(trimmed) ? trimmed : '#ffffff';
};

export default P5Preview;
