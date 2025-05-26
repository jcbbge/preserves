export interface PolaroidPhoto {
  id: string;
  src: string;
  caption: string;
  date: string;
  position?: { x: number; y: number };
  rotation?: number;
  zIndex?: number;
  captionStyle?: { fontSize: number; offsetY: number };
}

export interface PolaroidProps {
  id: string;
  src: string;
  caption: string;
  date: string;
  position?: { x: number; y: number };
  rotation?: number;
  zIndex?: number;
  textAngle?: number;
  textX?: number;
  textY?: number;
  dateAngle?: number;
  dateX?: number;
  dateY?: number;
  bgColor?: string;
  onMouseDown: (e: MouseEvent, id: string) => void;
  onTouchStart?: (e: TouchEvent) => void;
  class?: string;
  useRandomValues?: boolean;
}