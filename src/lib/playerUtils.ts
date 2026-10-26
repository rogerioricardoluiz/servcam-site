import { MockService } from '@/services/mockService';

/**
 * ServCam Tactical Player Utilities
 * Abre o popup da câmera livremente como uma página limpa sem link/URL.
 */

export const getCameraPlayerUrl = (cameraId: string): string => {
  if (typeof window === 'undefined') return `/player/${cameraId}`;
  const origin = window.location.origin;
  let path = window.location.pathname;
  if (!path.endsWith('/')) {
    path += '/';
  }
  return `${origin}${path}#/player/${encodeURIComponent(cameraId)}`;
};

export const normalizeStreamUrl = (rawInput: string): { isHtml: boolean; streamUrl: string; rawHtml: string } => {
  const cleanCode = (rawInput || '').trim();
  if (!cleanCode) {
    return { isHtml: false, streamUrl: '', rawHtml: '' };
  }

  const isHtmlCode = cleanCode.startsWith('<');
  let urlFromCode = '';
  if (isHtmlCode) {
    const srcMatch = cleanCode.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      urlFromCode = srcMatch[1];
    }
  }

  if (isHtmlCode && !urlFromCode) {
    return { isHtml: true, streamUrl: '', rawHtml: cleanCode };
  }

  let url = urlFromCode || cleanCode;
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') || url.includes('rtsp.me')) {
    url = url.replace(/^http:\/\//gi, 'https://');
  }

  try {
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      let videoId = '';
      if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(url.split('?')[1] || '');
        videoId = urlParams.get('v') || '';
      } else {
        videoId = url.split('/').pop()?.split('?')[0] || '';
      }
      if (videoId) {
        url = `https://www.youtube.com/embed/${videoId}`;
      }
    }

    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      urlObj.searchParams.set('autoplay', '1');
      urlObj.searchParams.set('mute', '1');
      urlObj.searchParams.set('muted', '1');
      urlObj.searchParams.set('controls', '0');
      urlObj.searchParams.set('showinfo', '0');
      urlObj.searchParams.set('rel', '0');
      urlObj.searchParams.set('modestbranding', '1');
      urlObj.searchParams.set('iv_load_policy', '3');
      urlObj.searchParams.set('playsinline', '1');
      urlObj.searchParams.set('loop', '1');
      const videoId = urlObj.pathname.split('/').pop();
      if (videoId) {
        urlObj.searchParams.set('playlist', videoId);
      }
    } else if (urlObj.hostname.includes('vimeo.com')) {
      urlObj.searchParams.set('autoplay', '1');
      urlObj.searchParams.set('mute', '1');
      urlObj.searchParams.set('muted', '1');
      urlObj.searchParams.set('background', '1');
      urlObj.searchParams.set('loop', '1');
      urlObj.searchParams.set('playsinline', '1');
      urlObj.searchParams.set('controls', '0');
    } else {
      urlObj.searchParams.set('autoplay', '1');
      urlObj.searchParams.set('mute', '1');
      urlObj.searchParams.set('muted', '1');
    }
    url = urlObj.toString();
  } catch {
    // Mantém a URL como está se não for parseável por new URL
  }

  return { isHtml: false, streamUrl: url, rawHtml: cleanCode };
};

export const openCameraPopup = (
  cameraId: string,
  cameraName?: string,
  iframeCode?: string
): null => {
  if (typeof window === 'undefined') return null;

  const triggerInAppPopup = (camData: { id: string; name: string; iframeCode: string }) => {
    window.dispatchEvent(
      new CustomEvent('servcam:open_free_camera_popup', {
        detail: camData
      })
    );
  };

  if (iframeCode !== undefined) {
    triggerInAppPopup({ id: cameraId, name: cameraName || 'Câmera Ao Vivo', iframeCode });
    return null;
  }

  // Abre imediatamente no estado de carregamento e preenche os dados da câmera em seguida
  triggerInAppPopup({ id: cameraId, name: cameraName || 'Carregando Câmera...', iframeCode: '__LOADING__' });

  MockService.getCameraById(cameraId)
    .then(cam => {
      triggerInAppPopup({
        id: cameraId,
        name: cameraName || cam?.name || 'Câmera Ao Vivo',
        iframeCode: cam?.iframeCode || ''
      });
    })
    .catch(() => {
      triggerInAppPopup({ id: cameraId, name: cameraName || 'Câmera Ao Vivo', iframeCode: '' });
    });

  return null;
};
