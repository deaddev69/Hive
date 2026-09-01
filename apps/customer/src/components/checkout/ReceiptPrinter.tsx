"use client";

import React, { createContext, useContext, ReactNode, ComponentPropsWithoutRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CheckCircle2, Loader2, Sparkles, MapPin, Package, ShieldCheck } from "lucide-react";
import { cn } from "@hive/ui";

export type ReceiptPrinterStage = "processing" | "printing" | "complete";
export type ReceiptFeedMotion = "smooth" | "stepped";

export type ReceiptPrinterRootProps = Omit<ComponentPropsWithoutRef<"section">, "children"> & {
  animate?: boolean;
  children: ReactNode;
  feedMotion?: ReceiptFeedMotion;
  stage: ReceiptPrinterStage;
};

type ReceiptPrinterContextValue = {
  animate: boolean;
  feedMotion: ReceiptFeedMotion;
  shouldMove: boolean;
  stage: ReceiptPrinterStage;
};

const ReceiptPrinterContext = createContext<ReceiptPrinterContextValue | null>(null);

const easeOut = [0.23, 1, 0.32, 1] as const;
const easeInOut = [0.77, 0, 0.175, 1] as const;

const receiptToothCount = 40;
const receiptToothDepth = 4;
const receiptToothPoints = Array.from(
  { length: receiptToothCount * 2 },
  (_, index) => {
    const x = 100 - ((index + 1) * 100) / (receiptToothCount * 2);
    const y = index % 2 === 0 ? "100%" : `calc(100% - ${receiptToothDepth}px)`;
    return `${x}% ${y}`;
  }
).join(", ");
const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${receiptToothDepth}px), ${receiptToothPoints})`;

const printingTransformKeyframes = [
  "translateY(calc(-100% + 2px))",
  "translateY(-91%)",
  "translateY(-91%)",
  "translateY(-81%)",
  "translateY(-81%)",
  "translateY(-70%)",
  "translateY(-70%)",
  "translateY(-58%)",
  "translateY(-58%)",
  "translateY(-45%)",
  "translateY(-45%)",
  "translateY(-32%)",
  "translateY(-32%)",
  "translateY(-20%)",
  "translateY(-20%)",
  "translateY(-10%)",
  "translateY(-10%)",
  "translateY(-3%)",
  "translateY(-3%)",
  "translateY(0%)",
];

const printingKeyframeTimes = [
  0, 0.075, 0.105, 0.18, 0.21, 0.285, 0.315, 0.39, 0.42, 0.495, 0.525, 0.6,
  0.63, 0.705, 0.735, 0.81, 0.84, 0.915, 0.945, 1,
];

const statusLabels: Record<ReceiptPrinterStage, ReactNode> = {
  processing: "Verifying order with Hive...",
  printing: "Printing your Hive receipt...",
  complete: "Order Confirmed & Paid",
};

function useReceiptPrinter(component: string) {
  const context = useContext(ReceiptPrinterContext);
  if (!context) {
    throw new Error(`${component} must be used inside ReceiptPrinter.Root.`);
  }
  return context;
}

export function ReceiptPrinterRoot({
  "aria-label": ariaLabel = "Hive Receipt printer",
  animate = true,
  children,
  className,
  feedMotion = "stepped",
  stage,
  ...props
}: ReceiptPrinterRootProps) {
  const shouldReduceMotion = useReducedMotion();
  const context = {
    animate,
    feedMotion,
    shouldMove: animate && !shouldReduceMotion,
    stage,
  };

  return (
    <ReceiptPrinterContext.Provider value={context}>
      <section
        aria-label={ariaLabel}
        className={cn("relative isolate flex w-full max-w-sm mx-auto flex-col items-center select-none", className)}
        data-stage={stage}
        {...props}
      >
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  );
}

export function ReceiptPrinterMachine({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "relative isolate w-full overflow-hidden rounded-3xl border border-stone-200/80 bg-hive-cream dark:bg-stone-900 p-4 pb-5 shadow-sm text-stone-900",
        className
      )}
      {...props}
    >
      {children}
      {/* Clean Subtle Paper Slit */}
      <div
        aria-hidden="true"
        className="absolute inset-x-6 bottom-1.5 z-40 h-1.5 rounded-full border border-stone-200 bg-stone-200/80 dark:bg-stone-800"
      />
    </div>
  );
}

export function ReceiptPrinterHeader({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("relative z-10 flex items-center justify-between pb-2.5 px-1 text-stone-800 dark:text-stone-200", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function ReceiptPrinterScreen({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "relative z-10 isolate overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-950 p-3.5 text-stone-900 dark:text-white shadow-2xs",
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function ReceiptPrinterStatus({
  children,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"div">, "children"> & { children?: ReactNode }) {
  const { animate, shouldMove, stage } = useReceiptPrinter("ReceiptPrinter.Status");
  const isComplete = stage === "complete";

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)} {...props}>
      <span aria-hidden="true" className="relative grid size-5 shrink-0 place-items-center">
        <AnimatePresence initial={false} mode="sync">
          {isComplete ? (
            <motion.span
              animate={{ opacity: 1, transform: "scale(1)" }}
              className="col-start-1 row-start-1 grid place-items-center text-emerald-400"
              exit={{ opacity: animate ? 0 : 1, transform: shouldMove ? "scale(0.96)" : "scale(1)" }}
              initial={{ opacity: animate ? 0 : 1, transform: shouldMove ? "scale(0.94)" : "scale(1)" }}
              key="complete"
              transition={{ duration: animate ? 0.16 : 0, ease: easeOut }}
            >
              <CheckCircle2 className="w-4.5 h-4.5" />
            </motion.span>
          ) : (
            <motion.span
              animate={{ opacity: 1, transform: "scale(1)" }}
              className="col-start-1 row-start-1 grid place-items-center text-amber-400"
              exit={{ opacity: animate ? 0 : 1, transform: shouldMove ? "scale(0.96)" : "scale(1)" }}
              initial={{ opacity: animate ? 0 : 1, transform: shouldMove ? "scale(0.94)" : "scale(1)" }}
              key="working"
              transition={{ duration: animate ? 0.16 : 0, ease: easeOut }}
            >
              <Loader2 className={cn("w-4.5 h-4.5", animate && "animate-spin motion-reduce:animate-none")} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      <div aria-live="polite" className="grid min-w-0 flex-1 items-center" role="status">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            className="col-start-1 row-start-1 truncate font-medium text-xs text-stone-300"
            exit={{ opacity: animate ? 0 : 1, transform: shouldMove ? "translateY(-4px)" : "translateY(0px)" }}
            initial={{ opacity: animate ? 0 : 1, transform: shouldMove ? "translateY(4px)" : "translateY(0px)" }}
            key={stage}
            transition={{ duration: animate ? 0.18 : 0, ease: easeOut }}
          >
            {children ?? statusLabels[stage]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function ReceiptPrinterPaper({
  children,
  className,
  style,
  ...props
}: ComponentPropsWithoutRef<"article">) {
  return (
    <article
      className={cn(
        "relative z-10 min-h-72 bg-[#FFFDF9] px-5 pt-6 pb-7 font-mono text-stone-900 shadow-xl border-x border-[#E8E1D3]",
        className
      )}
      style={{ clipPath: receiptClipPath, ...style }}
      {...props}
    >
      {children}
    </article>
  );
}

export function ReceiptPrinterOutput({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  const { animate, feedMotion, shouldMove, stage } = useReceiptPrinter("ReceiptPrinter.Output");
  const isReceiptVisible = stage !== "processing";
  const shouldUseSteppedFeed = feedMotion === "stepped" && stage === "printing" && shouldMove;

  return (
    <div
      className={cn(
        "relative z-50 -mt-3.5 w-full max-w-sm overflow-hidden px-4",
        className
      )}
      {...props}
    >
      {isReceiptVisible && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 -top-1 z-20 h-2 bg-stone-950/75 blur-[4px]"
        />
      )}

      <motion.div
        animate={
          stage === "processing"
            ? { y: "-100%", opacity: 0 }
            : stage === "printing"
            ? {
                y: shouldUseSteppedFeed ? printingTransformKeyframes.map((k) => k.replace("translateY(", "").replace(")", "")) : "0%",
                opacity: 1,
              }
            : { y: "0%", opacity: 1 }
        }
        aria-hidden={stage !== "complete"}
        className="relative isolate"
        initial={{ y: "-100%", opacity: 0 }}
        transition={{
          opacity: { duration: animate ? 0.2 : 0, ease: easeOut },
          y: {
            duration: stage === "printing" && shouldMove ? 2.0 : 0.4,
            ease: shouldUseSteppedFeed ? "linear" : easeInOut,
            times: shouldUseSteppedFeed && stage === "printing" ? printingKeyframeTimes : undefined,
          },
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export const ReceiptPrinter = {
  Header: ReceiptPrinterHeader,
  Machine: ReceiptPrinterMachine,
  Output: ReceiptPrinterOutput,
  Paper: ReceiptPrinterPaper,
  Root: ReceiptPrinterRoot,
  Screen: ReceiptPrinterScreen,
  Status: ReceiptPrinterStatus,
};
