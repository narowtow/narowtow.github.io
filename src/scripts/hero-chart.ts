type Site = {
  name: string;
  country: string;
  koppen: string;
  desc: string;
  x: number;
  y: number;
  skill: number;
  ciLow: number;
  ciHigh: number;
  maeModel: number;
  maeRef: number;
  reference: string;
};
document.querySelectorAll<HTMLElement>("[data-hero-chart]").forEach((chart) => {
  const plot = chart.querySelector<SVGSVGElement>("svg")!;
  const sites: Site[] = JSON.parse(
    chart.querySelector("[data-chart-sites]")!.textContent!,
  );
  const marks = [...chart.querySelectorAll<SVGCircleElement>("[data-site]")];
  const readout = chart.querySelector<HTMLElement>("[data-readout]")!;
  const initial = readout.textContent;
  const caption = chart.querySelector<HTMLElement>("[data-caption]")!;
  const skillCaption = caption.textContent;
  let current = -1;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  function show(index: number) {
    if (index === current) return;
    current = index;
    readout.scrollTop = 0;
    marks.forEach((mark) => mark.removeAttribute("data-current"));
    if (index < 0) {
      readout.textContent = initial;
      return;
    }
    const s = sites[index];
    marks
      .find((mark) => Number(mark.dataset.site) === index)
      ?.setAttribute("data-current", "true");
    readout.textContent = `${s.name}, ${s.country} · ${s.koppen}: ${s.desc}. Skill ${pct(s.skill)} (95% CI ${pct(s.ciLow)} to ${pct(s.ciHigh)}). Model MAE ${s.maeModel.toFixed(2)} °C vs ${s.maeRef.toFixed(2)} °C (${s.reference}).`;
  }
  plot.setAttribute("tabindex", "0");
  plot.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      show(-1);
      return;
    }
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    if (current < 0) {
      show(0);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      show(
        (current + (event.key === "ArrowRight" ? 1 : -1) + sites.length) %
          sites.length,
      );
      return;
    }
    const origin = sites[current];
    const north = event.key === "ArrowUp";
    const candidates = sites
      .map((s, i) => ({ i, dx: s.x - origin.x, dy: s.y - origin.y }))
      .filter((s) => (north ? s.dy < 0 : s.dy > 0))
      .sort((a, b) => a.dx * a.dx + a.dy * a.dy - (b.dx * b.dx + b.dy * b.dy));
    if (candidates.length) show(candidates[0].i);
  });
  function nearest(event: PointerEvent) {
    const box = plot.getBoundingClientRect(),
      scale = box.width / plot.viewBox.baseVal.width;
    let index = -1,
      distance = 12;
    sites.forEach((s, i) => {
      const d = Math.hypot(
        box.left + s.x * scale - event.clientX,
        box.top + s.y * scale - event.clientY,
      );
      if (d < distance) {
        distance = d;
        index = i;
      }
    });
    show(index);
  }
  plot.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "touch") nearest(event);
  });
  plot.addEventListener("pointerdown", nearest);
  plot.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "touch" && document.activeElement !== plot)
      show(-1);
  });
  new ResizeObserver(() => {
    const radius = Math.max(
      3.5,
      (3.5 * plot.viewBox.baseVal.width) / plot.getBoundingClientRect().width,
    );
    marks.forEach((mark) => mark.style.setProperty("r", `${radius}px`));
  }).observe(plot);
  chart.querySelector<HTMLElement>(".chart-toggle")!.hidden = false;
  chart
    .querySelectorAll<HTMLButtonElement>("button[data-mode]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const mode = button.dataset.mode!;
        chart.dataset.mode = mode;
        chart
          .querySelectorAll("button[data-mode]")
          .forEach((b) =>
            b.setAttribute(
              "aria-pressed",
              String((b as HTMLElement).dataset.mode === mode),
            ),
          );
        chart.querySelector("[data-legend-title]")!.textContent =
          mode === "skill"
            ? "Skill vs better baseline"
            : "Model mean absolute error (°C)";
        const labels =
          mode === "skill"
            ? ["< 0%", "0", "10%", "20%+"]
            : ["0.30", "1.25", "2.25", "3.44 °C"];
        chart
          .querySelectorAll("[data-legend-ticks] span")
          .forEach((s, i) => (s.textContent = labels[i]));
        const sorted = [...sites].sort((a, b) => a.maeModel - b.maeModel),
          low = sorted[0],
          high = sorted[sorted.length - 1];
        caption.textContent =
          mode === "skill"
            ? skillCaption
            : `Gradient boosting’s next-day high-temperature MAE ranges from ${low.maeModel.toFixed(2)} °C at ${low.name} to ${high.maeModel.toFixed(2)} °C at ${high.name}, across these 200 sites in held-out 2024–2025. Lower error means greater predictability in this retrospective ERA5 study.`;
      }),
    );
});
