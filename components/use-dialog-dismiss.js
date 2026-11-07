'use client';
import {useRef} from 'react';

// Native dialog backdrops retarget pointer events to the dialog itself.
// Require the gesture to start and end outside, so dragging from a field
// or selecting text across the edge does not dismiss the window.
export function useDialogDismiss(onDismiss){
 const beganOutside=useRef(false);
 function outside(event){
  const rect=event.currentTarget.getBoundingClientRect();
  return event.target===event.currentTarget&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom);
 }
 return {
  onPointerDown(event){beganOutside.current=event.button===0&&outside(event);},
  onPointerCancel(){beganOutside.current=false;},
  onClick(event){const dismiss=beganOutside.current&&outside(event);beganOutside.current=false;if(dismiss){event.stopPropagation();onDismiss();}}
 };
}
