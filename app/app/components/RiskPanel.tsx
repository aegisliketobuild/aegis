"use client";

interface RiskAlert {
  severity: "low" | "medium" | "high" | "critical";
  message: string;
}

interface Risk {
  score: number;
  alerts: RiskAlert[];
  stablecoinDeficit: number;
  overexposedTokens: { symbol: string; currentBps: number; maxBps: number }[];
}

export default function RiskPanel({ risk }: { risk: Risk | null }) {
  if (!risk) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Risk Assessment</h2>
        <p className="text-gray-500">Awaiting analysis...</p>
      </div>
    );
  }

  const scoreColor =
    risk.score > 50 ? "text-red-400" :
    risk.score > 20 ? "text-yellow-400" : "text-green-400";

  const scoreLabel =
    risk.score > 50 ? "High Risk" :
    risk.score > 20 ? "Moderate Risk" : "Low Risk";

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-4">Risk Assessment</h2>

      {/* Score gauge */}
      <div className="text-center mb-6">
        <div className={`text-4xl font-bold ${scoreColor}`}>{risk.score}</div>
        <div className={`text-sm ${scoreColor}`}>{scoreLabel}</div>
      </div>

      {/* Risk meter */}
      <div className="w-full h-2 bg-gray-800 rounded-full mb-6">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${risk.score}%`,
            background: risk.score > 50
              ? "linear-gradient(to right, #f59e0b, #ef4444)"
              : risk.score > 20
              ? "linear-gradient(to right, #10b981, #f59e0b)"
              : "#10b981",
          }}
        />
      </div>

      {/* Alerts */}
      {risk.alerts.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Active Alerts</h3>
          {risk.alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className={`badge-${alert.severity} shrink-0 mt-0.5`}>
                {alert.severity}
              </span>
              <span className="text-gray-300">{alert.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-green-400">All parameters within target range.</p>
      )}
    </div>
  );
}
