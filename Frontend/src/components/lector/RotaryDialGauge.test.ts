// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RotaryDialGauge from "./RotaryDialGauge.vue";

describe("RotaryDialGauge.vue", () => {
  it("rendert de SVG-slider met correcte ARIA-attributen", () => {
    const wrapper = mount(RotaryDialGauge, {
      props: {
        modelValue: 75,
        min: 20,
        max: 200,
        step: 1,
        color: "#22c55e",
        label: "Hartfrequentie regelaar",
      },
    });

    const slider = wrapper.get('[role="slider"]');
    expect(slider.attributes("aria-label")).toBe("Hartfrequentie regelaar");
    expect(slider.attributes("aria-valuemin")).toBe("20");
    expect(slider.attributes("aria-valuemax")).toBe("200");
    expect(slider.attributes("aria-valuenow")).toBe("75");
  });

  it("clampt de boog visueel wanneer de waarde buiten bereik ligt", () => {
    const wrapperAtMax = mount(RotaryDialGauge, {
      props: {
        modelValue: 200,
        min: 20,
        max: 200,
        color: "#22c55e",
        label: "HF",
      },
    });

    const wrapperAboveMax = mount(RotaryDialGauge, {
      props: {
        modelValue: 215,
        min: 20,
        max: 200,
        color: "#22c55e",
        label: "HF",
      },
    });

    const maxPaths = wrapperAtMax.findAll("path");
    const aboveMaxPaths = wrapperAboveMax.findAll("path");
    expect(aboveMaxPaths[1]?.attributes("d")).toBe(
      maxPaths[1]?.attributes("d"),
    );
  });

  it("berekent een nieuwe waarde bij klikken op de wijzerplaat", async () => {
    const wrapper = mount(RotaryDialGauge, {
      props: {
        modelValue: 75,
        min: 0,
        max: 100,
        step: 1,
        color: "#22c55e",
        label: "Test dial",
      },
    });

    const svg = wrapper.get("svg").element;
    svg.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 140,
        height: 140,
        right: 140,
        bottom: 140,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    // Top-center (12 o'clock) corresponds to midpoint (50%) of the 270-degree bottom-open arc
    await wrapper.get("svg").trigger("pointerdown", {
      clientX: 70,
      clientY: 10,
      pointerId: 1,
    });

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([50]);
  });
});
