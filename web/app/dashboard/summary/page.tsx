import { WeeklySummaryCard } from '@/components/log/WeeklySummaryCard'
import React from 'react'

const SummaryPage = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-4 border p-4 rounded-xl">
        <h1 className="text-xl font-semibold text-gray-800">Weekly Summary</h1>
        <WeeklySummaryCard/>

    </div>
  )
}

export default SummaryPage
