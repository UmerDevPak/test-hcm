"use client";

import React, { useState } from "react";
import { Crown, Sparkles, Check, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { RankBadge } from "@/components/performance/RankBadge";
import { performanceService } from "@/services/performanceService";
import { formatDate } from "@/lib/utils";

export function CelebrationBanner({ employee, onDismiss }) {
  const [celebrated, setCelebrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const notice = employee?.promotionNotice;
  if (!notice || notice.isNew === false || dismissed) {
    return null;
  }

  const handleCelebrate = async () => {
    setCelebrated(true);
    try {
      await performanceService.dismissPromotionNotice(employee.id);
    } catch {}
    setTimeout(() => {
      setDismissed(true);
      if (onDismiss) onDismiss();
    }, 1200);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, height: 0, margin: 0, overflow: "hidden" }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-indigo-900/70 to-pink-950/60 border border-purple-500/40 p-4 sm:p-5 shadow-glow"
      >
        {/* Glow ambient background circles */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-purple-600 flex items-center justify-center text-white shadow-lg shrink-0 ring-4 ring-purple-500/20">
              {celebrated ? (
                <PartyPopper className="w-6 h-6 animate-bounce" />
              ) : (
                <Crown className="w-6 h-6 animate-pulse" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Congratulations! You have been Promoted to {employee.ranking || notice.rank}!
                </span>
                <RankBadge rank={employee.ranking || notice.rank} size="sm" showTier />
              </div>

              <p className="text-xs text-purple-200/90 leading-relaxed max-w-2xl">
                {notice.reason || "Recognized for exemplary work performance, technical contributions, and cultural leadership."}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-purple-300/70 pt-0.5">
                <span>Approved by: <strong className="text-white font-medium">{notice.approvedBy || "Executive Leadership"}</strong></span>
                <span>•</span>
                <span>Date: {notice.promotedAt ? formatDate(notice.promotedAt) : "Recent"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
            <Button
              size="sm"
              onClick={handleCelebrate}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-md gap-1.5"
            >
              {celebrated ? (
                <>
                  <Check className="w-4 h-4" />
                  Celebrated!
                </>
              ) : (
                <>
                  <PartyPopper className="w-4 h-4" />
                  Acknowledge & Celebrate
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
