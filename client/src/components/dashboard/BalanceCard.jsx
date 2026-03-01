import React from "react";
import { motion } from "framer-motion";

const MotionBox = motion.div;

const BalanceCard = ({ current, lastWeek, lastMonth }) => {
  return (
    <MotionBox
      className="relative flex min-h-[275px] flex-col justify-center overflow-hidden rounded-2xl border border-[#3a63b5]/40 bg-gradient-to-br from-[rgba(4,12,46,0.88)] to-[rgba(8,20,66,0.78)] p-8 text-mist shadow-[0_16px_40px_rgba(0,0,0,0.56),0_0_26px_rgba(0,170,255,0.18)] backdrop-blur"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          background:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.0) 0px, rgba(255,255,255,0.0) 6px, rgba(74,130,255,0.1) 7px)",
        }}
      />
      <div className="mb-6 text-2xl font-extrabold tracking-wide text-sand">
        Balance Matrix
      </div>
      <div className="space-y-2 text-sm">
        <div className="font-semibold text-mist/80">
          Current: <span className="font-extrabold text-mist">{current}</span>
        </div>
        <div className="font-semibold text-mist/80">
          Last Week: <span className="font-extrabold text-mist">{lastWeek}</span>
        </div>
        <div className="font-semibold text-mist/80">
          Last Month: <span className="font-extrabold text-mist">{lastMonth}</span>
        </div>
      </div>
    </MotionBox>
  );
};

export default BalanceCard;
