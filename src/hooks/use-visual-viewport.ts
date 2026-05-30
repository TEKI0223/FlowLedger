"use client";

import { useEffect, useState } from "react";

type ViewportState = {
  /** 可视视口高度（键盘弹出后会变小）。 */
  height: number;
  /** 可视视口顶部相对布局视口的偏移；iOS 滚动时也会变。 */
  offsetTop: number;
};

/**
 * 跟踪 visualViewport，主要用于：
 * - iOS 软键盘弹出时，重新定位 fixed 元素到键盘上方
 * - 长页面滚动后，把 toast / popover 钉到可视视口
 *
 * 返回 null 时表示浏览器不支持或还未挂载，调用方应该退回到默认布局。
 */
export function useVisualViewport(): ViewportState | null {
  const [state, setState] = useState<ViewportState | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;

    function update() {
      setState({ height: vv.height, offsetTop: vv.offsetTop });
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}
