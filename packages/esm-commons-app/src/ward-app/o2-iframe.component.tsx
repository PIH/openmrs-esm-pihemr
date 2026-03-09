import { ArrowLeft } from '@carbon/react/icons';

import { IconButton, InlineLoading } from '@carbon/react';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './o2-iframe.scss';

interface O2IFrame {
  src: string;
  /**
   * a list of css selectors defining elements to hide within the iframe
   */
  elementsToHide?: string[];

  /**
   * a list of css selectors defining elements to be made un-clickable within the iframe
   */
  elementsToDisable?: string[];

  /**
   * JavaScript code to inject into the iframe to run
   */
  customJavaScript?: string;
}

const O2IFrame: React.FC<O2IFrame> = ({ src, elementsToHide, elementsToDisable, customJavaScript = '' }) => {
  const iframeRef = useRef<HTMLIFrameElement>();
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [isGoingBack, setIsGoingBack] = useState(false);
  const [iframeHistoryCount, setIframeHistoryCount] = useState(0);
  const { t } = useTranslation();

  const customCss = useMemo(() => {
    const toHide = elementsToHide?.map((e) => `${e} {display: none !important;}`)?.join('\n') ?? '';
    const toDisable =
      elementsToDisable?.map((e) => `${e} {pointer-events: none; cursor: not-allowed;}`)?.join('\n') ?? '';

    return `@media screen {
        ${toHide}
        ${toDisable} 
      }`;
  }, [elementsToHide, elementsToDisable]);

  const onLoad = () => {
    setIsIframeLoading(false);
    if (!isGoingBack) {
      setIframeHistoryCount(iframeHistoryCount + 1);
    }
    setIsGoingBack(false);
    iframeRef.current.contentWindow.addEventListener('beforeunload', () => setIsIframeLoading(true));
    const contentDocument = iframeRef.current.contentDocument;

    const styleTag = contentDocument.createElement('style');
    styleTag.innerHTML = customCss;
    contentDocument.head.appendChild(styleTag);

    const scriptTag = contentDocument.createElement('script');
    scriptTag.innerHTML = customJavaScript;
    contentDocument.body.appendChild(scriptTag);
  };

  const goBack = () => {
    iframeRef.current.contentWindow.history.back();
    setIframeHistoryCount(iframeHistoryCount - 1);
    setIsIframeLoading(true);
    setIsGoingBack(true);
  };

  return (
    <div className={styles.iframeWrapper}>
      <div className={styles.navigation}>
        <IconButton
          align="top-start"
          label={t('back', 'Back')}
          onClick={goBack}
          disabled={isIframeLoading || iframeHistoryCount <= 1}>
          <ArrowLeft />
        </IconButton>
        {isIframeLoading && <InlineLoading />}
      </div>
      <iframe ref={iframeRef} src={src} onLoad={onLoad} className={styles.o2Iframe} />
    </div>
  );
};

export default O2IFrame;
