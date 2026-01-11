"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const BRAND = {
  cyan: "#00D3D8",
  lime: "#D3FB52",
  blue: "#B9C4FB",
  purple: "#F5E6FF",
  darkCyan: "#00686D",
  black: "#14151C",
  gray: "#F3F4FA",
  white: "#FFFFFF",
};

type ErrorType = "Reasoning error" | "Recall error";
type ExampleTab = "Reasoning error" | "Recall error" | "Mixed signals";
type Flow = { factsCorrect?: boolean; logicCorrect?: boolean };

function classify(flow: Flow): ErrorType | null {
  if (flow.factsCorrect === false) return "Recall error";
  if (flow.factsCorrect === true && flow.logicCorrect === false)
    return "Reasoning error";
  return null;
}

function hintFor(tab: ExampleTab) {
  if (tab === "Reasoning error")
    return "Hint: Facts right + logic wrong usually signals a reasoning error.";
  if (tab === "Recall error")
    return "Hint: Facts wrong or missing usually signals a recall error.";
  return "Hint: Mixed signals is not a label. It’s a prompt to find the first failure.";
}

type ExampleItem = {
  id: string;
  tab: ExampleTab;
  classification: ErrorType;
  prompt: string;
  response: string;
  whatToNotice: string[];
  why: string;
};

const examples: ExampleItem[] = [
  {
    id: "ex_recall",
    tab: "Recall error",
    classification: "Recall error",
    prompt:
      "In the United States, what is the constitutional minimum age to serve as a U.S. Senator?",
    response:
      "The minimum age to serve as a U.S. Senator is 30 years old, but some sources say 35. Because leadership roles often require more experience, the Constitution sets it at 35.",
    whatToNotice: [
      "This is a factual question with one correct answer.",
      "The model introduces uncertainty and then picks the wrong value (35).",
      "The explanation sounds plausible, but it’s built on an incorrect fact.",
    ],
    why:
      "The core failure is factual accuracy. That’s recall failure, even if the explanation reads smoothly.",
  },
  {
    id: "ex_reasoning",
    tab: "Reasoning error",
    classification: "Reasoning error",
    prompt:
      "A train travels 120 miles in 2 hours. At the same speed, how long will it take to travel 90 miles?",
    response:
      "Speed = 120/2 = 60 mph. Time = distance/speed = 90/60 = 2 hours. So it will take 2 hours.",
    whatToNotice: [
      "The setup is correct (speed, then time).",
      "The division is wrong: 90/60 = 1.5, not 2.",
      "No missing knowledge, the method is misapplied at the end.",
    ],
    why:
      "The model has the right facts and approach, but executes incorrectly. That’s a reasoning breakdown.",
  },
  {
    id: "ex_mixed",
    tab: "Mixed signals",
    classification: "Recall error",
    prompt:
      "A recipe needs 3 eggs for 12 cookies. How many eggs are needed for 20 cookies?",
    response:
      "Eggs per cookie = 3/12 = 1/3. For 20 cookies: 20 × 1/3 = 20/3 = 6 eggs. So you need 6 eggs.",
    whatToNotice: [
      "The proportional reasoning is correct.",
      "But 20/3 = 6.67, not 6.",
      "The first failure is numerical accuracy (a wrong computed fact) before it becomes a wrong conclusion.",
    ],
    why:
      "Mixed signals are common. Don’t label “mixed.” Identify what failed first. If the first failure is incorrect facts or incorrect calculation, treat it as recall/accuracy failure.",
  },
];

type PracticeItem = {
  id: string;
  tab: ExampleTab;
  prompt: string;
  response: string;
  expertLabel: ErrorType;
  expertRationale: string;
  keyCues: string[];
};

const practiceItems: PracticeItem[] = [
  {
    id: "p_reasoning",
    tab: "Reasoning error",
    prompt:
      "A laptop costs $800 after a 20% discount. What was the original price?",
    response:
      "A 20% discount means you subtract 20% from the original price. So $800 − 0.20 = $799.80. The original price was $799.80.",
    expertLabel: "Reasoning error",
    expertRationale:
      "The model treats 20% as a flat $0.20 subtraction instead of a percentage of the original price. The concept is known, but applied incorrectly.",
    keyCues: [
      "Percent discounts require dividing by (1 − discount), not subtracting 0.20.",
      "The output barely changes from 800, which is a red flag for percent math.",
      "No missing fact is required here, it’s rule application.",
    ],
  },
  {
    id: "p_recall",
    tab: "Recall error",
    prompt: "What is the chemical symbol for gold?",
    response:
      "The chemical symbol for gold is Gd, which comes from its Latin name.",
    expertLabel: "Recall error",
    expertRationale:
      "This is a straightforward factual recall item. The model gives the wrong symbol (Au is correct) and then rationalizes it.",
    keyCues: [
      "Single-fact question with a known correct answer.",
      "Incorrect core fact (Gd is gadolinium, not gold).",
      "The explanation is filler, not evidence.",
    ],
  },
  {
    id: "p_mixed",
    tab: "Mixed signals",
    prompt:
      "A store buys a chair for $40 and sells it for $50. What is the percent profit?",
    response:
      "Profit = $50 − $40 = $10. Percent profit = 10/50 = 20%. So the profit is 20%.",
    expertLabel: "Reasoning error",
    expertRationale:
      "The model computes profit correctly, but uses the wrong base. Percent profit should be profit/cost, not profit/selling price.",
    keyCues: [
      "The first step is correct (profit = 10).",
      "The failure happens at the denominator choice (base).",
      "This is rule application, not missing facts.",
    ],
  },
];

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "cyan" | "lime" | "purple" | "blue" | "neutral";
}) {
  const style =
    tone === "cyan"
      ? { background: BRAND.cyan, color: BRAND.black }
      : tone === "lime"
      ? { background: BRAND.lime, color: BRAND.black }
      : tone === "purple"
      ? { background: BRAND.purple, color: BRAND.black }
      : tone === "blue"
      ? { background: BRAND.blue, color: BRAND.black }
      : { background: "#EEF2FF", color: BRAND.black };

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
      style={style}
    >
      {children}
    </span>
  );
}

function Button({
  children,
  onClick,
  active,
  variant = "ghost",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  variant?: "ghost" | "primary" | "pill";
  disabled?: boolean;
}) {
  const base =
    "rounded-xl border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.99]";
  const commonDisabled = disabled
    ? "opacity-50 cursor-not-allowed"
    : "cursor-pointer";

  if (variant === "primary") {
    return (
      <button
        onClick={disabled ? undefined : onClick}
        className={`${base} border-transparent hover:shadow-sm ${commonDisabled}`}
        style={{ background: BRAND.lime, color: BRAND.black }}
        aria-disabled={disabled}
      >
        {children}
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        onClick={disabled ? undefined : onClick}
        className={`${base} rounded-full px-4 hover:bg-slate-50 ${commonDisabled}`}
        style={{
          background: active ? BRAND.cyan : BRAND.white,
          color: BRAND.black,
          borderColor: active ? BRAND.darkCyan : "#E2E8F0",
        }}
        aria-disabled={disabled}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`${base} hover:bg-slate-50 ${commonDisabled}`}
      style={{
        background: active ? BRAND.black : BRAND.white,
        color: active ? BRAND.white : BRAND.black,
        borderColor: active ? BRAND.black : "#E2E8F0",
      }}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {right}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function DividerLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <pre className="whitespace-pre-wrap text-sm text-slate-800">{text}</pre>
    </div>
  );
}

function ExampleCard({ ex }: { ex: ExampleItem }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {hintFor(ex.tab)}
      </div>

      <div className="mt-2 text-sm font-semibold text-slate-900">Example</div>

      <div className="mt-4 grid gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Prompt
          </div>
          <div className="mt-2">
            <TextBlock text={ex.prompt} />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Model response
          </div>
          <div className="mt-2">
            <TextBlock text={ex.response} />
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: BRAND.gray }}>
          <div className="text-sm font-semibold">What to notice</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {ex.whatToNotice.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <div className="mt-3 text-sm text-slate-700">
            <span className="font-semibold">Why this matters:</span> {ex.why}
          </div>
        </div>

        {ex.tab === "Mixed signals" && (
          <div
            className="rounded-xl p-3 text-sm"
            style={{ background: BRAND.purple }}
          >
            <span className="font-semibold">Important:</span> Mixed signals is
            not a label. It’s a prompt to find the first failure.
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonBox({
  yourLabel,
  yourRationale,
  expertLabel,
  expertRationale,
}: {
  yourLabel: ErrorType | "";
  yourRationale: string;
  expertLabel: ErrorType;
  expertRationale: string;
}) {
  const match = yourLabel === expertLabel;

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Your answer vs expert</div>
          <div className="mt-1 text-xs text-slate-600">
            Compare labels first. Then check whether your rationale identifies
            the first failure.
          </div>
        </div>

        <Badge tone={match ? "lime" : "neutral"}>
          {match ? "Aligned" : "Different"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">You</div>
            {yourLabel ? (
              <Badge tone={yourLabel === "Reasoning error" ? "purple" : "blue"}>
                {yourLabel}
              </Badge>
            ) : (
              <Badge tone="neutral">No label</Badge>
            )}
          </div>
          <div className="mt-3 text-sm text-slate-700">
            <span className="font-semibold">Rationale:</span>{" "}
            {yourRationale.trim().length ? yourRationale : "Not provided."}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Expert</div>
            <Badge tone={expertLabel === "Reasoning error" ? "purple" : "blue"}>
              {expertLabel}
            </Badge>
          </div>
          <div className="mt-3 text-sm text-slate-700">
            <span className="font-semibold">Rationale:</span> {expertRationale}
          </div>
        </div>
      </div>

      {!match && yourLabel && (
        <div
          className="mt-3 rounded-xl p-3 text-sm"
          style={{ background: BRAND.gray }}
        >
          <span className="font-semibold">Calibration tip:</span> Re-run the
          decision steps and ask: “Did the model lack correct facts, or did it
          misuse correct facts?”
        </div>
      )}
    </div>
  );
}

export default function Page() {
  const [section, setSection] = useState<
    "Start" | "Model" | "Heuristic" | "Examples" | "Practice"
  >("Start");

  const PAGE_PAD = "px-4 sm:px-8";
  const GRID = "grid grid-cols-[56px_1fr] gap-3";

  const [flow, setFlow] = useState<Flow>({});
  const result = useMemo(() => classify(flow), [flow]);

  // IMPORTANT: this keeps the Examples selection persistent.
  const [exampleTab, setExampleTab] = useState<ExampleTab>("Recall error");
  const currentExample = examples.find((e) => e.tab === exampleTab)!;

  const [practiceIndex, setPracticeIndex] = useState(0);
  const currentPractice = practiceItems[practiceIndex];

  const [practiceType, setPracticeType] = useState<"" | ErrorType>("");
  const [practiceExplain, setPracticeExplain] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [showExpert, setShowExpert] = useState(false);
  const [mixedMode, setMixedMode] = useState(false);

  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    if (!printMode) return;
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, [printMode]);

  useEffect(() => {
    const handler = () => setPrintMode(false);
    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
  }, []);

  const printAll = () => {
    setFlow({});
    setShowExpert(true);
    setPrintMode(true);
  };

  const show = (key: typeof section) => printMode || section === key;

  const resetPractice = () => {
    setPracticeType("");
    setPracticeExplain("");
    setAttempted(false);
    setShowExpert(false);
    setMixedMode(false);
  };

  const nextPractice = () => {
    const next = (practiceIndex + 1) % practiceItems.length;
    setPracticeIndex(next);
    resetPractice();
  };

  const canRevealExpert =
    attempted || (practiceType && practiceExplain.trim().length > 0);

  return (
    <main
      className="min-h-screen"
      style={{
        background: BRAND.gray,
        color: BRAND.black,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      {/* subtle background splash */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-20"
          style={{ background: BRAND.cyan }}
        />
        <div
          className="absolute top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-20"
          style={{ background: BRAND.blue }}
        />
        <div
          className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl opacity-15"
          style={{ background: BRAND.lime }}
        />
      </div>

      {/* header */}
      <div className="border-b border-slate-200 bg-white">
        <div
          className="h-2 w-full"
          style={{
            background: `linear-gradient(90deg, ${BRAND.cyan}, ${BRAND.blue})`,
          }}
        />

        <div className={`mx-auto max-w-5xl ${PAGE_PAD} py-5`}>
          <div className={GRID}>
            <div className="pt-1">
              <Image
                src="/hai-avatar.png"
                alt="Handshake AI avatar"
                width={46}
                height={46}
                className="rounded-full"
                priority
              />
            </div>

            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="purple">Handshake AI</Badge>
                    <Badge tone="cyan">Mini lesson</Badge>
                    <Badge tone="neutral">8–10 min</Badge>
                    {printMode && <Badge tone="lime">Print view</Badge>}
                  </div>

                  <h1 className="mt-2 text-2xl font-bold tracking-tight">
                    Reasoning vs Recall Errors
                  </h1>

                  <div
                    className="mt-3 h-1 w-24 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${BRAND.cyan}, ${BRAND.blue})`,
                    }}
                  />

                  <p className="mt-2 text-base leading-snug text-slate-600">
                    Learn to distinguish reasoning errors from recall errors by
                    diagnosing what failed first.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="primary" onClick={printAll}>
                    Print / Save
                  </Button>
                </div>
              </div>

              {!printMode && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    ["Start", "Start here"],
                    ["Model", "How models fail"],
                    ["Heuristic", "How to decide"],
                    ["Examples", "Examples"],
                    ["Practice", "You try!"],
                  ].map(([key, label]) => (
                    <Button
                      key={key}
                      variant="pill"
                      onClick={() => setSection(key as any)}
                      active={section === key}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* content */}
      <div className={`mx-auto max-w-5xl ${PAGE_PAD} py-6`}>
        <div className={GRID}>
          <div />
          <div className="grid gap-5">
            {/* START */}
            {show("Start") && (
              <div className="print-section">
                {printMode && <DividerLabel label="Start here" />}
                <Card title="Start here: Focus on how the failure happened">
                  <p className="text-sm text-slate-700">
                    When an AI response is wrong, the most important question is
                    not <em>whether</em> it failed, but <em>how</em> it failed.
                  </p>
                  <p className="mt-3 text-sm text-slate-700">
                    Correctly identifying the failure type leads to better
                    training data and faster model improvement.
                  </p>

                  <div
                    className="mt-4 rounded-xl p-4"
                    style={{ background: BRAND.gray }}
                  >
                    <div className="text-sm font-semibold">Key idea</div>
                    <p className="mt-1 text-sm text-slate-700">
                      A model can have the right facts and still reach the wrong
                      conclusion (reasoning error). A model can reason well and
                      still fail if its facts are wrong (recall error).
                    </p>
                  </div>
                </Card>
              </div>
            )}

            {/* MODEL */}
            {show("Model") && (
              <div className="print-section">
                {printMode && <DividerLabel label="How models fail" />}
                <Card title="How models fail: Two common failure types">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">Recall error</div>
                        <Badge tone="blue">Facts wrong/missing</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">
                        The model relies on incorrect, missing, or fabricated
                        facts. The logic may look coherent, but the inputs are
                        wrong.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">
                          Reasoning error
                        </div>
                        <Badge tone="purple">Logic breakdown</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">
                        The model has the right facts, but applies them
                        incorrectly or breaks down across steps.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* HEURISTIC */}
            {show("Heuristic") && (
              <div className="print-section">
                {printMode && <DividerLabel label="How to decide" />}
                <Card
                  title="How to decide: Classify most failures in under 20 seconds"
                  right={
                    <Button variant="pill" onClick={() => setFlow({})}>
                      Reset
                    </Button>
                  }
                >
                  <p className="text-sm text-slate-700">
                    This isn’t about finding the perfect label. It’s about
                    identifying the first failure so feedback improves the
                    model.
                  </p>

                  <p className="mt-2 text-sm text-slate-700">
                    Start by determining whether the failure is driven by facts
                    or by logic.
                  </p>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold">
                      Step 1: Are the facts correct and sufficient?
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        onClick={() => setFlow({ factsCorrect: true })}
                        active={flow.factsCorrect === true}
                      >
                        Yes
                      </Button>
                      <Button
                        onClick={() => setFlow({ factsCorrect: false })}
                        active={flow.factsCorrect === false}
                      >
                        No
                      </Button>
                    </div>
                    <p className="mt-3 text-xs text-slate-600">
                      If facts are wrong or missing, stop. That’s a recall
                      error.
                    </p>
                  </div>

                  {flow.factsCorrect === true && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-sm font-semibold">
                        Step 2: Does the logic apply those facts correctly
                        across steps?
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          onClick={() =>
                            setFlow({ factsCorrect: true, logicCorrect: true })
                          }
                          active={flow.logicCorrect === true}
                        >
                          Yes
                        </Button>
                        <Button
                          onClick={() =>
                            setFlow({ factsCorrect: true, logicCorrect: false })
                          }
                          active={flow.logicCorrect === false}
                        >
                          No
                        </Button>
                      </div>
                      <p className="mt-3 text-xs text-slate-600">
                        Facts right + logic wrong usually signals a reasoning
                        error.
                      </p>
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">
                          Classification
                        </div>
                        <div className="mt-1 text-sm text-slate-700">
                          {result ? (
                            <span className="font-semibold">{result}</span>
                          ) : (
                            "Start with Step 1"
                          )}
                        </div>
                      </div>
                      {result && (
                        <Badge
                          tone={
                            result === "Reasoning error" ? "purple" : "blue"
                          }
                        >
                          {result}
                        </Badge>
                      )}
                    </div>

                    <div
                      className="mt-3 rounded-xl p-3 text-sm"
                      style={{ background: BRAND.gray }}
                    >
                      <div className="font-semibold">Fallback rule</div>
                      <div className="mt-1 text-slate-700">
                        Identify what failed{" "}
                        <span className="font-semibold">first</span>: facts or
                        logic.
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* EXAMPLES */}
            {show("Examples") && (
              <div className="print-section">
                {printMode && <DividerLabel label="Examples" />}
                <Card title="Examples: Spot the pattern fast">
                  <p className="text-sm text-slate-700">
                    Three error patterns that drive most quality issues in
                    practice. Use the hint, then label what failed first.
                  </p>

                  {!printMode && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(["Recall error", "Reasoning error"] as ExampleTab[]).map(
                        (t) => (
                          <Button
                            key={t}
                            variant="pill"
                            onClick={() => setExampleTab(t)}
                            active={exampleTab === t}
                          >
                            {t}
                          </Button>
                        )
                      )}

                      <button
                        onClick={() => setExampleTab("Mixed signals")}
                        className="rounded-full px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                        style={{
                          background:
                            exampleTab === "Mixed signals" ? "#EFE7FF" : "#FAF8FF",
                          color: "#14151C",
                          border:
                            exampleTab === "Mixed signals"
                              ? "1px solid #D8CCFF"
                              : "1px dashed #D8CCFF",
                        }}
                      >
                        Mixed signals
                      </button>

                      <div className="w-full">
                        <div className="mt-2 text-xs text-slate-600">
                          Use “Mixed signals” to slow down and identify the first
                          failure. Do not submit it as a label.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 grid gap-4">
                    {printMode ? (
                      examples.map((ex) => <ExampleCard key={ex.id} ex={ex} />)
                    ) : (
                      <ExampleCard ex={currentExample} />
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* PRACTICE */}
            {show("Practice") && (
              <div className="print-section">
                {printMode && <DividerLabel label="You try!" />}
                <Card
                  title="You try! Make the call, then calibrate"
                  right={
                    !printMode ? (
                      <div className="flex items-center gap-2">
                        <Button onClick={resetPractice}>Reset</Button>
                        <Button variant="primary" onClick={nextPractice}>
                          Next
                        </Button>
                      </div>
                    ) : undefined
                  }
                >
                  <p className="text-sm text-slate-700">
                    One scenario at a time. Explain what failed first, then
                    compare to the expert.
                  </p>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">
                      Practice scenario {practiceIndex + 1} of{" "}
                      {practiceItems.length}
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Prompt
                        </div>
                        <div className="mt-2">
                          <TextBlock text={currentPractice.prompt} />
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Model response
                        </div>
                        <div className="mt-2">
                          <TextBlock text={currentPractice.response} />
                        </div>
                      </div>
                    </div>

                    {!printMode && (
                      <>
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="text-sm font-semibold">Your call</div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              onClick={() => {
                                setPracticeType("Recall error");
                                setMixedMode(false);
                              }}
                              active={practiceType === "Recall error"}
                            >
                              Recall error
                            </Button>

                            <Button
                              onClick={() => {
                                setPracticeType("Reasoning error");
                                setMixedMode(false);
                              }}
                              active={practiceType === "Reasoning error"}
                            >
                              Reasoning error
                            </Button>

                            <button
                              onClick={() => setMixedMode((v) => !v)}
                              className="rounded-full px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                              style={{
                                background: mixedMode ? "#EFE7FF" : "#FAF8FF",
                                color: "#14151C",
                                border: mixedMode
                                  ? "1px solid #D8CCFF"
                                  : "1px dashed #D8CCFF",
                              }}
                            >
                              Mixed signals
                            </button>
                          </div>

                          {mixedMode && (
                            <div
                              className="mt-3 rounded-xl p-3 text-sm"
                              style={{ background: BRAND.purple }}
                            >
                              <span className="font-semibold">
                                Mixed signals is not a label.
                              </span>{" "}
                              It’s a prompt to find the first failure. Identify
                              what broke first, then classify it as{" "}
                              <span className="font-semibold">Reasoning</span>{" "}
                              or <span className="font-semibold">Recall</span>.
                            </div>
                          )}

                          <div className="mt-4">
                            <label className="text-sm font-semibold">
                              1-sentence rationale (name what failed first)
                            </label>
                            <textarea
                              className="mt-2 w-full rounded-2xl border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-offset-2"
                              style={{ borderColor: "#E2E8F0" }}
                              rows={3}
                              placeholder='Example: "Facts are correct, but the model applies the rule incorrectly in the setup."'
                              value={practiceExplain}
                              onChange={(e) =>
                                setPracticeExplain(e.target.value)
                              }
                            />
                            <p className="mt-2 text-xs text-slate-600">
                              If you can’t name what failed first, re-run the
                              How to decide steps before submitting.
                            </p>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              variant="primary"
                              onClick={() => {
                                setAttempted(true);
                                setMixedMode(false);
                              }}
                              disabled={
                                !practiceType ||
                                practiceExplain.trim().length === 0
                              }
                            >
                              Submit my answer
                            </Button>

                            <Button
                              onClick={() => setShowExpert(true)}
                              disabled={!canRevealExpert}
                              active={showExpert}
                            >
                              Reveal expert response
                            </Button>
                          </div>

                          {attempted && (
                            <div className="mt-3 text-xs text-slate-600">
                              Answer submitted. Now compare your judgment to the
                              expert.
                            </div>
                          )}
                        </div>

                        {attempted && (
                          <ComparisonBox
                            yourLabel={practiceType}
                            yourRationale={practiceExplain}
                            expertLabel={currentPractice.expertLabel}
                            expertRationale={currentPractice.expertRationale}
                          />
                        )}

                        {showExpert && (
                          <div
                            className="mt-4 rounded-2xl p-4"
                            style={{ background: BRAND.gray }}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold">
                                  Expert response
                                </div>
                                <div className="mt-1 text-sm text-slate-700">
                                  <span className="font-semibold">Label:</span>{" "}
                                  {currentPractice.expertLabel}
                                </div>
                                <div className="mt-2 text-sm text-slate-700">
                                  <span className="font-semibold">
                                    1-sentence rationale:
                                  </span>{" "}
                                  {currentPractice.expertRationale}
                                </div>
                              </div>
                              <Badge
                                tone={
                                  currentPractice.expertLabel ===
                                  "Reasoning error"
                                    ? "purple"
                                    : "blue"
                                }
                              >
                                {currentPractice.expertLabel}
                              </Badge>
                            </div>

                            <div className="mt-3">
                              <div className="text-sm font-semibold">
                                Key cues the expert used
                              </div>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                                {currentPractice.keyCues.map((c) => (
                                  <li key={c}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Print-only scale note */}

            <div className="pb-8" />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          button {
            display: none !important;
          }
          main {
            background: white !important;
          }

          /* Each major section starts on a new page (clean PDF) */
          .print-section {
            break-before: page;
            page-break-before: always;
          }
          .print-section:first-of-type {
            break-before: auto;
            page-break-before: auto;
          }

          /* Prevent orphaned divider labels / headings */
          .print-section > *:first-child {
            break-after: avoid;
            page-break-after: avoid;
          }

          /* Avoid splitting cards */
          section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          pre {
            font-size: 11px;
            line-height: 1.35;
          }
        }
      `}</style>
    </main>
  );
}