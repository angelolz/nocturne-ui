import { useState, useEffect } from "react";

export function useCenterTrackDisplay() {
  const [centerTrackDisplay, setCenterTrackDisplay] =
  useState(false);

  useEffect(() => {
    const centerTrackDisplay = localStorage.getItem("centerTrackDisplay");
    if (centerTrackDisplay === null) {
      localStorage.setItem("centerTrackDisplay", "false");
      setCenterTrackDisplay(false);
    } else {
        setCenterTrackDisplay(centerTrackDisplay === "true");
    }
  }, []);

  return {
    centerTrackDisplay
  };
}