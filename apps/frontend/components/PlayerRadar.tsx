"use client"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

const COLOR = "#3b82f6"

interface Props {
  data: { subject: string; value: number }[]
}

export default function PlayerRadar({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#0f1a2e" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "#8892a4", fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          dataKey="value"
          stroke={COLOR}
          fill={COLOR}
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{ background: "#111", border: "1px solid #2a1a1a", borderRadius: 8, color: "#f0e0e0" }}
          labelStyle={{ color: "#f0e0e0" }}
          itemStyle={{ color: COLOR }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
