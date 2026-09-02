"use client";

import { useEffect } from "react";

const scrollToSection = (targetId: string) => {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
};

export const useMetricSection = <T extends string>(
  sectionByTarget: Readonly<Record<string, T>>,
  setSection: (section: T) => void,
) => {
  useEffect(() => {
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    const section = sectionByTarget[targetId];
    if (!section) return;

    setSection(section);
    scrollToSection(targetId);
  }, [sectionByTarget, setSection]);
};
