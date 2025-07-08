<script lang="ts">
    import { onMount } from 'svelte';
    import RealTimeMonitor from './RealTimeMonitor.svelte';
    import UPlotChart from './UPlotChart.svelte';
    import CurveChartManager from './CurveChartManager.svelte';
    
    // Reactive state declarations for the monitor modal
    let showMonitorModal = $state(false);
    let monitorModalPosition = $state({ x: 100, y: 100 });
    let monitorModalSize = $state({ width: 600, height: 400 });
    let monitorTableData = $state([]);
    
    // 实时计算的图表数据
    let realTimeCharts = $state([
        {
            id: 1,
            name: '实时曲线图-1',
            curves: [
                { name: '高压涡轮出口总压' },
                { name: '高压压气机出口总压' },
                { name: '低压涡轮出口总压' }
            ]
        },
        {
            id: 2,
            name: '实时曲线图-2', 
            curves: [
                { name: '低压涡轮出口温度' },
                { name: '风扇出口总压' },
                { name: '高压压气机出口温度' }
            ]
        }
    ]);
    
    // 实时图表数据存储
    let realTimeChartDataSets = $state<Map<number, {name: string, data: number[][]}>>(new Map());
    
    // 参数列表 - 与过渡态计算相同
    const leftParameterList = $state([
        { name: '低压涡轮进口总压', selected: false },
        { name: '高压涡轮进口总压', selected: false },
        { name: '发动机进口总流量', selected: false },
        { name: '发动机进口净压阻力', selected: false },
        { name: '发动机总转速', selected: false },
        { name: '主燃烧室转速', selected: false },
        { name: '加力燃烧室转速', selected: false },
        { name: '风扇出口总压', selected: false },
        { name: '高压压气机出口温度', selected: false },
        { name: '高压涡轮进口温度', selected: false },
        { name: '低压涡轮进口温度', selected: false },
        { name: '低压涡轮出口温度', selected: false },
        { name: '风扇出口总压', selected: false },
        { name: '高压压气机出口总压', selected: false },
        { name: '高压涡轮出口总压', selected: false },
        { name: '低压涡轮出口总压', selected: false }
    ]);

    const rightParameterList = $state([
        { name: '发动机净马力', selected: false },
        { name: '发动机总马力', selected: false },
        { name: '循环装置面积', selected: false },
        { name: '循环装置总压', selected: false },
        { name: '循环出口总压', selected: false },
        { name: '循环装置温度', selected: false },
        { name: '循环出口温度', selected: false },
        { name: '循环装置流量温度', selected: false },
        { name: '循环出口流量', selected: false },
        { name: '循环装置总压', selected: false },
        { name: '循环出口总压', selected: false },
        { name: '循环装置流量温度', selected: false },
        { name: '循环出口流量', selected: false },
        { name: '循环压力损失系数', selected: false },
        { name: '喷管出口速度', selected: false },
        { name: '喷管推力损失系数', selected: false }
    ]);
    
    // 初始化实时图表数据
    function initializeRealTimeChartData() {
        realTimeCharts.forEach(chart => {
            // 生成模拟实时数据
            const dataPoints: number[][] = [];
            for (let i = 0; i < 50; i++) {
                const time = i * 0.1;
                const dataRow = [time];
                
                chart.curves.forEach((curve, curveIndex) => {
                    const baseValue = 1000 + curveIndex * 200;
                    const value = baseValue + Math.sin(time * 0.5 + curveIndex) * 100 + Math.random() * 50;
                    dataRow.push(value);
                });
                
                dataPoints.push(dataRow);
            }
            
            realTimeChartDataSets.set(chart.id, {
                name: chart.name,
                data: dataPoints
            });
        });
        
        // 触发响应式更新
        realTimeChartDataSets = new Map(realTimeChartDataSets);
    }
    
    // 处理图表变化
    function handleRealTimeChartsChange(newCharts: typeof realTimeCharts) {
        realTimeCharts = newCharts;
        // 为新图表初始化数据
        realTimeCharts.forEach(chart => {
            if (!realTimeChartDataSets.has(chart.id)) {
                // 为新图表生成初始数据
                const dataPoints: number[][] = [];
                for (let i = 0; i < 50; i++) {
                    const time = i * 0.1;
                    const dataRow = [time];
                    
                    chart.curves.forEach((curve, curveIndex) => {
                        const baseValue = 1000 + curveIndex * 200;
                        const value = baseValue + Math.sin(time * 0.5 + curveIndex) * 100 + Math.random() * 50;
                        dataRow.push(value);
                    });
                    
                    dataPoints.push(dataRow);
                }
                
                realTimeChartDataSets.set(chart.id, {
                    name: chart.name,
                    data: dataPoints
                });
            }
        });
        
        // 触发响应式更新
        realTimeChartDataSets = new Map(realTimeChartDataSets);
    }
    // Throttle functions for mouse events
    function handleThrottleMouseMove(e: MouseEvent) {
        // Implementation for mouse move handling
    }
    
    function handleThrottleMouseUp() {
        // Implementation for mouse up handling
    }
    
    // 组件挂载时初始化数据
    onMount(() => {
        initializeRealTimeChartData();
    });
</script>

<svelte:window
    onmousemove={(e) => {
        handleThrottleMouseMove(e);
    }}
    onmouseup={() => {
        handleThrottleMouseUp();
    }}
/>

<div class="min-h-[calc(100vh-120px)] bg-gray-900 p-4 sm:p-6 lg:p-8">
    <div class="w-full mx-auto h-full">
        <div class="flex h-full gap-4">
            <!-- 左侧曲线组面板 -->
            <CurveChartManager 
                bind:charts={realTimeCharts}
                leftParameters={leftParameterList}
                rightParameters={rightParameterList}
                onChartsChange={handleRealTimeChartsChange}
            />

            <!-- 右侧图表区域 -->
            <div class="flex-1 flex flex-col">
                <!-- 顶部控制栏 -->
                <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
                    <div class="flex justify-between items-center">
                        <!-- 左侧：实时计算状态 -->
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-2">
                                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span class="text-sm text-gray-300">实时计算运行中</span>
                            </div>
                            <div class="text-xs text-gray-400">
                                游标同步: 启用
                            </div>
                        </div>
                        
                        <!-- 右侧：控制按钮 -->
                        <div class="flex items-center gap-2">
                            <button
                                class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                                onclick={() => showMonitorModal = true}
                            >
                                监控
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 图表显示区域 -->
                <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-4 overflow-y-auto">
                    <div class="grid grid-cols-1 gap-6">
                        {#each realTimeCharts as chart (chart.id)}
                            <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg">
                                <!-- 图表标题 -->
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-lg font-semibold text-gray-200 flex items-center gap-2">
                                        <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                        </svg>
                                        {chart.name}
                                    </h3>
                                    <div class="text-xs text-gray-400">
                                        实时数据: {realTimeChartDataSets.get(chart.id)?.data.length || 0} 点
                                    </div>
                                </div>

                                <!-- uPlot图表容器 - 使用实时同步组 -->
                                <div class="bg-gray-900 rounded-lg p-4 border border-gray-600">
                                    <UPlotChart 
                                        chartId={chart.id}
                                        chartName={chart.name}
                                        curves={chart.curves}
                                        data={realTimeChartDataSets.get(chart.id)?.data || []}
                                        syncGroup="realtime-charts"
                                        subplotMode={true}
                                        subplotHeight={120}
                                        xAxisLabel="时间 (秒)"
                                    />
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- 实时监控弹窗 - 使用封装的组件 -->
<RealTimeMonitor
    bind:isVisible={showMonitorModal}
    bind:position={monitorModalPosition}
    bind:size={monitorModalSize}
    data={monitorTableData}
/>