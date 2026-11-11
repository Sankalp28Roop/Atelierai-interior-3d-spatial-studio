import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          'auto-rotate'?: boolean | string;
          'camera-controls'?: boolean | string;
          ar?: boolean | string;
          'ar-modes'?: string;
          'shadow-intensity'?: string | number;
          'shadow-softness'?: string | number;
          exposure?: string | number;
          'camera-orbit'?: string;
          'field-of-view'?: string;
          'environment-image'?: string;
          loading?: 'auto' | 'lazy' | 'eager';
          poster?: string;
          bounds?: string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          'auto-rotate'?: boolean | string;
          'camera-controls'?: boolean | string;
          ar?: boolean | string;
          'ar-modes'?: string;
          'shadow-intensity'?: string | number;
          'shadow-softness'?: string | number;
          exposure?: string | number;
          'camera-orbit'?: string;
          'field-of-view'?: string;
          'environment-image'?: string;
          loading?: 'auto' | 'lazy' | 'eager';
          poster?: string;
          bounds?: string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}
