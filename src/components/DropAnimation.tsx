import { JSX, onMount } from "solid-js";
import { seededRandom } from "~/utils/polaroidUtils";

interface DropAnimationProps {
  children: JSX.Element;
  id: string;
  isExposed?: boolean;
  delay?: number;
  onAnimationStart?: () => void;
  disabled?: boolean;
}

export function DropAnimation(props: DropAnimationProps) {
  let containerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (!props.isExposed && !props.disabled && containerRef) {
      props.onAnimationStart?.();

      // Generate random values based on ID
      const startScale = seededRandom(`${props.id}_scale`, 1.8, 2.2);
      const startZ = seededRandom(`${props.id}_z`, 400, 600);
      const startRotate = seededRandom(`${props.id}_rotate`, -5, 5);
      const endRotate = seededRandom(`${props.id}_end_rotate`, -1, 2);
      const duration = seededRandom(`${props.id}_duration`, 500, 600);
      const randomDelay = seededRandom(`${props.id}_delay`, 0, 400);

      // Set initial state
      containerRef.style.transform = `scale(${startScale}) translateZ(${startZ}px) rotate(${startRotate}deg)`;
      containerRef.style.opacity = "0";
      containerRef.style.transition = "none";

      // Force layout
      containerRef.offsetHeight;

      // Apply animation
      setTimeout(() => {
        const totalDelay = (props.delay || 0) + randomDelay;
        containerRef.style.transition = `all ${duration}ms ease-in ${totalDelay}ms`;
        containerRef.style.transform = `scale(1) translateZ(0) rotate(${endRotate}deg)`;
        containerRef.style.opacity = "1";
      }, 10);
    }
  });

  return (
    <div ref={containerRef} style={{ "transform-style": "preserve-3d" }}>
      {props.children}
    </div>
  );
}
