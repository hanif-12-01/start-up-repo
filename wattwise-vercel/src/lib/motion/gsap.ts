import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// Register GSAP plugins safely when window environment is present
if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP);
}

export { gsap, useGSAP };
