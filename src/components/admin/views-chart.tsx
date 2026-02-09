import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChartData {
  date: string
  views: number
}

interface ViewsChartProps {
  data?: ChartData[] | null
}

export function ViewsChart({ data }: ViewsChartProps) {
  const source = Array.isArray(data) ? data : []
  const hasSource = source.length > 0
  const fallbackDates = Array.from({ length: 30 }, (_, idx) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - idx))
    return d.toISOString().split('T')[0]
  })
  const chartData: ChartData[] = hasSource
    ? source
    : fallbackDates.map((date) => ({ date, views: 0 }))

  const maxViews = Math.max(...chartData.map((d) => d.views))
  const hasData = maxViews > 0
  const minDate = new Date(`${chartData[0].date}T00:00:00`)
  const maxDate = new Date(`${chartData[chartData.length - 1].date}T00:00:00`)

  return (
    <Card>
      <CardHeader>
        <CardTitle>阅读趋势（最近30天）</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {minDate.toLocaleDateString('zh-CN')} - {maxDate.toLocaleDateString('zh-CN')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <div className="flex items-stretch justify-between gap-1 h-full px-2">
            {chartData.map((item, index) => {
              const height = maxViews > 0 ? (item.views / maxViews) * 100 : 12

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center h-full"
                >
                  {/* Bar container */}
                  <div className="relative w-full flex-1 flex items-end group">
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded whitespace-nowrap">
                        {item.date}: {item.views} 次阅读
                      </div>
                    </div>

                    {/* Bar */}
                    <div
                      className={`w-full rounded-t-sm transition-all duration-200 cursor-pointer relative ${hasData ? 'bg-gradient-to-t from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* X轴标签 */}
          <div className="flex justify-between mt-2 px-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{chartData[0].date}</span>
            <span>{chartData[Math.floor(chartData.length / 2)].date}</span>
            <span>{chartData[chartData.length - 1].date}</span>
          </div>
          {!hasData && (
            <div className="mt-3 text-center text-xs text-gray-400">
              近 30 天暂无阅读数据（已显示占位趋势）
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
