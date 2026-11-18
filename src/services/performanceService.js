import { INITIAL_PERFORMANCE_REVIEWS } from "@/lib/seedData";
import { employeeService } from "@/services/employeeService";
import { auditService } from "@/services/auditService";
import { isLiveFirebaseConfigured, db, auth } from "@/lib/firebase/client";
import { handleFirestoreError, isPermissionError, OperationType } from "@/lib/firebase/errorHandler";
import { isLiveUserHrOrAdmin } from "@/lib/firebase/roleCheck";

const STORAGE_REVIEWS = "hcm_lite_performance_reviews";
const STORAGE_PROMOTIONS = "hcm_lite_promotion_recommendations";

export const INITIAL_PROMOTION_RECOMMENDATIONS = [
  {
    id: "REC-101",
    employeeId: "EMP-006",
    employeeName: "Lucas Silva",
    department: "Design",
    jobTitle: "Principal Product Designer",
    currentRank: "Rank C",
    recommendedRank: "Rank B",
    workScore: 84,
    behaviorScore: 88,
    workJustification:
      "Lucas restructured our enterprise component library, completed 14 UI sprint backlog tasks, and reduced frontend design debt by 40% over the last sprint cycle.",
    behaviorJustification:
      "Showed outstanding attitude and patience conducting 3 design-token workshops for engineering and mentoring junior team members.",
    submittedBy: "Aaliyah Patel (Senior HR Business Partner)",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    status: "Pending Admin Review",
    adminDecisionNotes: null,
    reviewedBy: null,
    reviewedAt: null,
  },
  {
    id: "REC-100",
    employeeId: "EMP-003",
    employeeName: "Elena Rostova",
    department: "Engineering",
    jobTitle: "Staff Software Engineer",
    currentRank: "Rank B",
    recommendedRank: "Rank A",
    workScore: 96,
    behaviorScore: 95,
    workJustification:
      "Elena architected the real-time biometric synchronization pipeline with 99.99% availability, preventing attendance clock drift across all 3 remote gateways.",
    behaviorJustification:
      "Exemplary culture carrier, spearheads technical brown-bags, and consistently steps in to unblock cross-functional initiatives.",
    submittedBy: "Aaliyah Patel (Senior HR Business Partner)",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    status: "Approved",
    adminDecisionNotes: "Approved promotion to Rank A. Elena's engineering caliber and peer mentorship represent benchmark standard.",
    reviewedBy: "Sarah Connor (Super Admin)",
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
];

function getReviews() {
  if (typeof window === "undefined") return INITIAL_PERFORMANCE_REVIEWS;
  const stored = localStorage.getItem(STORAGE_REVIEWS);
  if (!stored) {
    localStorage.setItem(STORAGE_REVIEWS, JSON.stringify(INITIAL_PERFORMANCE_REVIEWS));
    return INITIAL_PERFORMANCE_REVIEWS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_PERFORMANCE_REVIEWS;
  }
}

function saveReviews(list) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_REVIEWS, JSON.stringify(list));
  }
}

function getLocalPromotions() {
  if (typeof window === "undefined") return INITIAL_PROMOTION_RECOMMENDATIONS;
  const stored = localStorage.getItem(STORAGE_PROMOTIONS);
  if (!stored) {
    localStorage.setItem(STORAGE_PROMOTIONS, JSON.stringify(INITIAL_PROMOTION_RECOMMENDATIONS));
    return INITIAL_PROMOTION_RECOMMENDATIONS;
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PROMOTION_RECOMMENDATIONS;
  } catch {
    return INITIAL_PROMOTION_RECOMMENDATIONS;
  }
}

function saveLocalPromotions(list) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_PROMOTIONS, JSON.stringify(list));
  }
}

let memoryPromotionsCache = null;
let lastPromotionsFetch = 0;

export const performanceService = {
  // --- Standard Performance Reviews ---
  async getAllReviews({ employeeId = "" } = {}) {
    let list = getReviews();
    if (employeeId) list = list.filter((r) => r.employeeId === employeeId);
    return list;
  },

  async createReview(data) {
    const list = getReviews();
    const newReview = {
      id: `REV-${Math.floor(300 + Math.random() * 700)}`,
      status: "Completed",
      completedDate: new Date().toISOString().split("T")[0],
      ...data,
    };
    list.unshift(newReview);
    saveReviews(list);
    return newReview;
  },

  async getPerformanceStats() {
    const list = getReviews();
    const avgScore = list.length
      ? (list.reduce((acc, curr) => acc + (curr.overallScore || 0), 0) / list.length).toFixed(1)
      : "5.0";
    return {
      totalReviews: list.length,
      averageScore: avgScore,
      completedCount: list.filter((r) => r.status === "Completed").length,
    };
  },

  // --- Employee Categorization & Rank Stats ---
  async getRankingStats() {
    const employees = await employeeService.getAllEmployees();
    const total = employees.length || 1;

    let rankA = 0;
    let rankB = 0;
    let rankC = 0;
    let totalWork = 0;
    let totalBehavior = 0;

    employees.forEach((emp) => {
      if (emp.ranking === "Rank A") rankA++;
      else if (emp.ranking === "Rank C") rankC++;
      else rankB++;

      totalWork += emp.workScore ?? (emp.ranking === "Rank A" ? 95 : emp.ranking === "Rank C" ? 72 : 85);
      totalBehavior += emp.behaviorScore ?? (emp.ranking === "Rank A" ? 95 : emp.ranking === "Rank C" ? 70 : 86);
    });

    const pendingRecs = (await this.getPromotionRecommendations({ status: "Pending Admin Review" })).length;

    return {
      totalEmployees: total,
      counts: {
        "Rank A": rankA,
        "Rank B": rankB,
        "Rank C": rankC,
      },
      percentages: {
        "Rank A": Math.round((rankA / total) * 100),
        "Rank B": Math.round((rankB / total) * 100),
        "Rank C": Math.round((rankC / total) * 100),
      },
      averageWorkScore: Math.round(totalWork / total),
      averageBehaviorScore: Math.round(totalBehavior / total),
      pendingRecommendationsCount: pendingRecs,
    };
  },

  // --- HR Promotion Recommendations ---
  async getPromotionRecommendations({ status = "", employeeId = "" } = {}, forceRefresh = false) {
    if (!forceRefresh && memoryPromotionsCache && Date.now() - lastPromotionsFetch < 30000) {
      let cached = [...memoryPromotionsCache];
      if (status) cached = cached.filter((r) => r.status === status);
      if (employeeId) cached = cached.filter((r) => r.employeeId === employeeId);
      return cached;
    }

    let list = getLocalPromotions();

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const canRead = await isLiveUserHrOrAdmin();
        if (canRead) {
          const { collection, getDocs } = await import("firebase/firestore");
          const snap = await Promise.race([
            getDocs(collection(db, "promotion_recommendations")),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1200)),
          ]);
          if (!snap.empty) {
            const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            remote.forEach((rem) => {
              const idx = list.findIndex((l) => l.id === rem.id);
              if (idx !== -1) list[idx] = rem;
              else list.unshift(rem);
            });
          }
        }
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.LIST, "promotion_recommendations");
        }
        console.warn("[performanceService] Firestore promotions query notice:", err.message);
      }
    }

    list.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
    saveLocalPromotions(list);
    memoryPromotionsCache = list;
    lastPromotionsFetch = Date.now();

    let filtered = [...list];
    if (status) filtered = filtered.filter((r) => r.status === status);
    if (employeeId) filtered = filtered.filter((r) => r.employeeId === employeeId);
    return filtered;
  },

  /**
   * HR submits a promotion / rank change recommendation to Admin
   */
  async submitPromotionRecommendation({
    employeeId,
    employeeName,
    department,
    jobTitle,
    currentRank,
    recommendedRank,
    workScore,
    behaviorScore,
    workJustification,
    behaviorJustification,
    submittedBy = "HR Manager",
  }) {
    if (!employeeId || !recommendedRank) {
      throw new Error("Employee ID and recommended rank are required.");
    }

    const newId = `REC-${Math.floor(100 + Math.random() * 900)}`;
    const recommendation = {
      id: newId,
      employeeId,
      employeeName: employeeName || "Team Member",
      department: department || "General",
      jobTitle: jobTitle || "Role",
      currentRank: currentRank || "Rank B",
      recommendedRank,
      workScore: workScore != null ? Number(workScore) : 85,
      behaviorScore: behaviorScore != null ? Number(behaviorScore) : 85,
      workJustification: workJustification || "Demonstrated significant technical & sprint contributions.",
      behaviorJustification: behaviorJustification || "Exhibits positive conduct, teamwork, and dependability.",
      submittedBy,
      submittedAt: new Date().toISOString(),
      status: "Pending Admin Review",
      adminDecisionNotes: null,
      reviewedBy: null,
      reviewedAt: null,
    };

    const list = getLocalPromotions();
    const updated = [recommendation, ...list.filter((r) => r.id !== newId)];
    saveLocalPromotions(updated);
    memoryPromotionsCache = updated;

    // Detached non-blocking background Firestore sync
    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      import("firebase/firestore")
        .then(async ({ doc, setDoc }) => {
          try {
            const canWrite = await isLiveUserHrOrAdmin();
            if (canWrite) {
              await setDoc(doc(db, "promotion_recommendations", newId), recommendation);
            }
          } catch (err) {
            console.warn("[performanceService] Firestore promotion write notice:", err.message);
          }
        })
        .catch(() => {});
    }

    // Detached non-blocking Audit log
    auditService.logAudit({
      actor: submittedBy,
      role: "HR",
      module: "Talent & Performance",
      action: "Submitted Rank Promotion Recommendation",
      target: `${recommendation.employeeName} (${recommendation.employeeId})`,
      oldValue: recommendation.currentRank,
      newValue: `Recommend ${recommendation.recommendedRank}`,
      status: "info",
    }).catch(() => {});

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hcm_promotion_updated", { detail: recommendation }));
      window.dispatchEvent(new CustomEvent("hcm_config_updated"));
    }

    return recommendation;
  },

  /**
   * Admin approves HR recommendation, promoting the employee (Instant 0ms response)
   */
  async approvePromotionRecommendation(recommendationId, { adminName = "Sarah Connor", adminNotes = "" } = {}) {
    const list = getLocalPromotions();
    const index = list.findIndex((r) => r.id === recommendationId);
    if (index === -1) {
      throw new Error("Promotion recommendation not found.");
    }

    const rec = { ...list[index] };
    rec.status = "Approved";
    rec.reviewedBy = adminName;
    rec.reviewedAt = new Date().toISOString();
    rec.adminDecisionNotes = adminNotes || `Approved by Executive Leadership (${adminName}). Promoted to ${rec.recommendedRank}.`;

    list[index] = rec;
    saveLocalPromotions(list);
    memoryPromotionsCache = list;

    // Apply promotion directly to employee record (instant synchronous peek)
    const targetEmp = employeeService.peekEmployeeById(rec.employeeId) || (await employeeService.getEmployeeById(rec.employeeId));
    if (targetEmp) {
      const historyItem = {
        id: `PRM-${Date.now()}`,
        fromRank: rec.currentRank,
        toRank: rec.recommendedRank,
        promotedAt: rec.reviewedAt,
        approvedBy: adminName,
        reason: rec.adminDecisionNotes,
        hrRecommendationId: rec.id,
      };

      const updatedHistory = [historyItem, ...(targetEmp.promotionHistory || [])];

      employeeService.updateEmployee(targetEmp.id, {
        ranking: rec.recommendedRank,
        workScore: rec.workScore != null ? Number(rec.workScore) : targetEmp.workScore,
        behaviorScore: rec.behaviorScore != null ? Number(rec.behaviorScore) : targetEmp.behaviorScore,
        rankingNotes: `Promoted to ${rec.recommendedRank} on ${new Date().toISOString().split("T")[0]}.`,
        promotionHistory: updatedHistory,
        promotionNotice: {
          isNew: true,
          rank: rec.recommendedRank,
          promotedAt: rec.reviewedAt,
          approvedBy: adminName,
          reason: rec.adminDecisionNotes,
        },
      });
    }

    // Detached non-blocking background Firestore sync
    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      import("firebase/firestore")
        .then(async ({ doc, updateDoc }) => {
          try {
            const canWrite = await isLiveUserHrOrAdmin();
            if (canWrite) {
              await updateDoc(doc(db, "promotion_recommendations", recommendationId), {
                status: "Approved",
                reviewedBy: adminName,
                reviewedAt: rec.reviewedAt,
                adminDecisionNotes: rec.adminDecisionNotes,
              });
            }
          } catch (err) {
            console.warn("[performanceService] Firestore approve notice:", err.message);
          }
        })
        .catch(() => {});
    }

    // Detached non-blocking Audit log
    auditService.logAudit({
      actor: adminName,
      role: "ADMIN",
      module: "Executive Governance",
      action: "Approved Talent Promotion & Rank Upgrade",
      target: `${rec.employeeName} (${rec.employeeId})`,
      oldValue: rec.currentRank,
      newValue: rec.recommendedRank,
      status: "success",
    }).catch(() => {});

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hcm_promotion_updated", { detail: rec }));
      window.dispatchEvent(new CustomEvent("hcm_config_updated"));
    }

    return rec;
  },

  /**
   * Admin rejects or returns recommendation with feedback (Instant 0ms response)
   */
  async rejectPromotionRecommendation(recommendationId, { adminName = "Sarah Connor", reason = "" } = {}) {
    const list = getLocalPromotions();
    const index = list.findIndex((r) => r.id === recommendationId);
    if (index === -1) {
      throw new Error("Promotion recommendation not found.");
    }

    const rec = { ...list[index] };
    rec.status = "Rejected";
    rec.reviewedBy = adminName;
    rec.reviewedAt = new Date().toISOString();
    rec.adminDecisionNotes = reason || "Does not meet the criteria for executive promotion in current appraisal period.";

    list[index] = rec;
    saveLocalPromotions(list);
    memoryPromotionsCache = list;

    // Detached non-blocking background Firestore sync
    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      import("firebase/firestore")
        .then(async ({ doc, updateDoc }) => {
          try {
            const canWrite = await isLiveUserHrOrAdmin();
            if (canWrite) {
              await updateDoc(doc(db, "promotion_recommendations", recommendationId), {
                status: "Rejected",
                reviewedBy: adminName,
                reviewedAt: rec.reviewedAt,
                adminDecisionNotes: rec.adminDecisionNotes,
              });
            }
          } catch (err) {
            console.warn("[performanceService] Firestore reject notice:", err.message);
          }
        })
        .catch(() => {});
    }

    // Detached non-blocking Audit log
    auditService.logAudit({
      actor: adminName,
      role: "ADMIN",
      module: "Executive Governance",
      action: "Declined Talent Promotion Recommendation",
      target: `${rec.employeeName} (${rec.employeeId})`,
      oldValue: rec.currentRank,
      newValue: `Retained ${rec.currentRank}`,
      status: "warning",
    }).catch(() => {});

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hcm_promotion_updated", { detail: rec }));
      window.dispatchEvent(new CustomEvent("hcm_config_updated"));
    }

    return rec;
  },

  /**
   * Admin directly promotes or re-ranks an employee immediately (Executive action)
   */
  async promoteEmployeeDirectly({
    employeeId,
    newRank,
    adminName = "Sarah Connor",
    reason = "Executive appraisal & performance tier reclassification",
    workScore,
    behaviorScore,
  }) {
    const targetEmp = await employeeService.getEmployeeById(employeeId);
    if (!targetEmp) {
      throw new Error("Employee not found.");
    }

    const prevRank = targetEmp.ranking || "Rank B";
    const historyItem = {
      id: `PRM-${Date.now()}`,
      fromRank: prevRank,
      toRank: newRank,
      promotedAt: new Date().toISOString(),
      approvedBy: adminName,
      reason,
      directAdminPromotion: true,
    };

    const updatedHistory = [historyItem, ...(targetEmp.promotionHistory || [])];

    const updates = {
      ranking: newRank,
      rankingNotes: reason,
      promotionHistory: updatedHistory,
      promotionNotice: {
        isNew: true,
        rank: newRank,
        promotedAt: historyItem.promotedAt,
        approvedBy: adminName,
        reason,
      },
    };

    if (workScore != null) updates.workScore = Number(workScore);
    if (behaviorScore != null) updates.behaviorScore = Number(behaviorScore);

    const updatedEmp = await employeeService.updateEmployee(targetEmp.id, updates);

    // Audit trail
    await auditService.logAudit({
      actor: adminName,
      role: "ADMIN",
      module: "Executive Governance",
      action: "Direct Executive Rank Adjustment",
      target: `${targetEmp.name} (${targetEmp.id})`,
      oldValue: prevRank,
      newValue: newRank,
      status: "success",
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hcm_promotion_updated", { detail: updatedEmp }));
      window.dispatchEvent(new CustomEvent("hcm_config_updated"));
    }

    return updatedEmp;
  },

  /**
   * Employee acknowledges celebratory promotion banner
   */
  async dismissPromotionNotice(employeeId) {
    if (!employeeId) return;
    const targetEmp = await employeeService.getEmployeeById(employeeId);
    if (targetEmp && targetEmp.promotionNotice) {
      await employeeService.updateEmployee(targetEmp.id, {
        promotionNotice: {
          ...targetEmp.promotionNotice,
          isNew: false,
          acknowledgedAt: new Date().toISOString(),
        },
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("hcm_config_updated"));
      }
    }
  },
};
