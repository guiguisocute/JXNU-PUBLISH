import { ImageProxyMode, MediaUrl, selectMediaUrl } from '../types';

let currentImageProxyMode: ImageProxyMode = 'none';

export const setImageProxyMode = (mode: ImageProxyMode): void => {
  currentImageProxyMode = mode;
};

export const getImageProxyMode = (): ImageProxyMode => {
  return currentImageProxyMode;
};

export const getMediaUrl = (media: MediaUrl | string | undefined): string => {
  return selectMediaUrl(media, currentImageProxyMode);
};

export const proxyImageUrl = (url: string): string => {
  return url;
};
