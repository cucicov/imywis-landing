import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type TouchEvent,
} from 'react';
import './CumulativeCenterSlider.css';

type CumulativeCenterSliderProps = {
  min?: number;
  max?: number;
  step?: number;
  initialCumulativeValue?: number;
  cumulativeValue?: number;
  minCumulativeValue?: number;
  showValuePreview?: boolean;
  onCumulativeChange?: (value: number) => void;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
};

const CumulativeCenterSlider = ({
  min = 0,
  max = 100,
  step = 1,
  initialCumulativeValue = 0,
  cumulativeValue,
  minCumulativeValue = Number.NEGATIVE_INFINITY,
  showValuePreview = true,
  onCumulativeChange,
  className,
  style,
  ariaLabel = 'Cumulative center slider',
}: CumulativeCenterSliderProps) => {
  const centerValue = useMemo(() => (min + max) / 2, [max, min]);
  const [sliderValue, setSliderValue] = useState(centerValue);
  const [internalCumulativeValue, setInternalCumulativeValue] = useState(() =>
    Math.max(initialCumulativeValue, minCumulativeValue)
  );
  const [isDragging, setIsDragging] = useState(false);
  const previousSliderValueRef = useRef(centerValue);
  const pendingResetRafRef = useRef<number | null>(null);
  const effectiveCumulativeValue = typeof cumulativeValue === 'number'
    ? Math.max(cumulativeValue, minCumulativeValue)
    : internalCumulativeValue;

  const resetSliderToCenter = useCallback(() => {
    previousSliderValueRef.current = centerValue;
    setSliderValue(centerValue);
  }, [centerValue]);

  const requestCenterReset = useCallback(() => {
    setIsDragging(false);
    if (pendingResetRafRef.current !== null) {
      window.cancelAnimationFrame(pendingResetRafRef.current);
    }
    pendingResetRafRef.current = window.requestAnimationFrame(() => {
      pendingResetRafRef.current = null;
      resetSliderToCenter();
    });
  }, [resetSliderToCenter]);

  const updateCumulative = (delta: number) => {
    if (delta === 0) {
      return;
    }

    const next = Math.max(effectiveCumulativeValue + delta, minCumulativeValue);
    if (typeof cumulativeValue !== 'number') {
      setInternalCumulativeValue(next);
    }
    onCumulativeChange?.(next);
  };

  const handleSliderChange = (rawValue: number) => {
    const delta = rawValue - previousSliderValueRef.current;
    previousSliderValueRef.current = rawValue;
    setSliderValue(rawValue);
    updateCumulative(delta);
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key === 'ArrowLeft'
      || event.key === 'ArrowRight'
      || event.key === 'ArrowUp'
      || event.key === 'ArrowDown'
      || event.key === 'Home'
      || event.key === 'End'
    ) {
      resetSliderToCenter();
    }
  };

  const startDragFromMouse = (event: MouseEvent<HTMLInputElement>) => {
    event.stopPropagation();
    setIsDragging(true);
  };

  const startDragFromPointer = (event: PointerEvent<HTMLInputElement>) => {
    event.stopPropagation();
    setIsDragging(true);
  };

  const startDragFromTouch = (event: TouchEvent<HTMLInputElement>) => {
    event.stopPropagation();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const onPointerRelease = () => {
      requestCenterReset();
    };

    window.addEventListener('pointerup', onPointerRelease);
    window.addEventListener('mouseup', onPointerRelease);
    window.addEventListener('touchend', onPointerRelease);
    window.addEventListener('touchcancel', onPointerRelease);

    return () => {
      window.removeEventListener('pointerup', onPointerRelease);
      window.removeEventListener('mouseup', onPointerRelease);
      window.removeEventListener('touchend', onPointerRelease);
      window.removeEventListener('touchcancel', onPointerRelease);
    };
  }, [isDragging, requestCenterReset]);

  useEffect(() => {
    return () => {
      if (pendingResetRafRef.current !== null) {
        window.cancelAnimationFrame(pendingResetRafRef.current);
      }
    };
  }, []);

  return (
    <div className={`cumulative-center-slider nodrag nopan nowheel${className ? ` ${className}` : ''}`} style={style}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        aria-label={ariaLabel}
        className="cumulative-center-slider__input nodrag nopan nowheel"
        onInput={(event) => handleSliderChange(Number((event.target as HTMLInputElement).value))}
        onMouseDown={startDragFromMouse}
        onTouchStart={startDragFromTouch}
        onPointerDown={startDragFromPointer}
        onMouseUp={requestCenterReset}
        onTouchEnd={requestCenterReset}
        onPointerUp={requestCenterReset}
        onBlur={resetSliderToCenter}
        onKeyUp={handleKeyUp}
      />
      {showValuePreview && (
        <span className="cumulative-center-slider__value">{effectiveCumulativeValue}</span>
      )}
    </div>
  );
};

export default CumulativeCenterSlider;
