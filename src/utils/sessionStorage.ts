export const LATEST_SELECTED_PAGE_NAME_SESSION_KEY = 'imywis.latestSelectedPageName';
export const DEFAULT_LATEST_SELECTED_PAGE_NAME = 'No page selected';
export const LATEST_SELECTED_PAGE_NAME_CHANGED_EVENT = 'imywis:latest-selected-page-name-changed';

export const getLatestSelectedPageNameFromSession = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_LATEST_SELECTED_PAGE_NAME;
  }

  const storedValue = window.sessionStorage.getItem(LATEST_SELECTED_PAGE_NAME_SESSION_KEY);
  return storedValue && storedValue.trim().length > 0
    ? storedValue
    : DEFAULT_LATEST_SELECTED_PAGE_NAME;
};

export const setLatestSelectedPageNameInSession = (pageName: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(LATEST_SELECTED_PAGE_NAME_SESSION_KEY, pageName);
  window.dispatchEvent(
    new CustomEvent<string>(LATEST_SELECTED_PAGE_NAME_CHANGED_EVENT, {
      detail: pageName,
    })
  );
};
