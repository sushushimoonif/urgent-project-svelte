<script lang="ts">
    import CurveChartManager from './CurveChartManager.svelte';
    import RealTimeMonitor from './RealTimeMonitor.svelte';
    import UPlotChart from './UPlotChart.svelte';
    import SwitcherGroup from "./SwitcherGroup.svelte";
    import ParamsInputGroup from "./ParamsInputGroup.svelte";

    import { invoke } from "@tauri-apps/api/core";

    let isCalculating = $state(false);
    let isPaused = $state(false);
    let showResults = $state(false);
    let storagePath = $state("");
    let showMonitorModal = $state(false);

    let switcherData = $state([0, 0]);
    $inspect(switcherData);

    // 模态框位置状态
    let monitorModalPosition = $state({ x: 200, y: 150 });
    let monitorModalSize = $state({ width: 400, height: 500 });

    // 参数名称映射 - 用于显示界面
    let parameterLabels = $state([
        { name: "高度", range: "(0~22000)", unit: "m", value: 0 },
        { name: "马赫数", range: "(0~2.5)", unit: "", value: 0 },
        { name: "温度修正", range: "(-50~50)", unit: "K", value: 0 },
        {
            name: "进气道总压恢复系数",
            range: "(0~1.1)",
            unit: "m",
            value: -1,
        },
        { name: "功率提取", range: "(0~600)", unit: "kW", value: 0 },
        {
            name: "压气机出口座舱引气",
            range: "(0~2)",
            unit: "%",
            value: 0,
        },
        {
            name: "油门杆角度",
            range: "(0~115)",
            unit: "deg",
            value: 66,
        },
    ]);

    // 更新dataIN中的选项状态
    function updateDataINOptions() {
        // 将parameterLabels中的数据添加到dataIN
        parameterLabels.forEach((param) => {
            dataIn.push({ name: param.name, data: [parseFloat(param.value)] });
        });

        dataIn.push({ name: "作战or训练", data: [switcherData[0]] });
        dataIn.push({ name: "地面or空中", data: [switcherData[1]] });

        dataIn.push({ name: "油门杆角度", data: [throttleValue] });
    }

    interface DataEntry {
        name: string;
        data: number[];
    }

    // 输入参数数据结构 - 修改为新格式，包含作战/训练、地面/空中
    let dataIn: DataEntry[] = [];

    // 输出数据结构 - dataOut格式
    let dataOut = $state<Array<{ name: string; data: number[] }>>([]);

    // 仿真步长状态 - 只能选择一个
    let selectedSimulationStep = $state("0.025");

    // 模式选择状态 - 只能选择一个
    let selectedMode = $state("作战");
    let selectedEnvironment = $state("地面");

    // 油门杆角度控制
    let throttleValue = $state(66.66);
    let isDraggingThrottle = $state(false);
    let throttleContainer: HTMLElement | null = null;

    // 初始曲线图数据
    let curveCharts = $state([
        {
            id: 1,
            name: "曲线图-1",
            curves: [
                { name: "高压涡轮出口总压" },
                { name: "高压压气机出口总压" },
                { name: "低压涡轮出口总压" },
            ],
        },
        {
            id: 2,
            name: "曲线图-2",
            curves: [
                { name: "低压涡轮出口温度" },
                { name: "风扇出口总压" },
                { name: "高压压气机出口温度" },
            ],
        },
        {
            id: 3,
            name: "曲线图-3",
            curves: [
                { name: "高压涡轮进口温度" },
                { name: "低压涡轮进口温度" },
                { name: "喷管出口速度" },
            ],
        },
    ]);

    // 参数列表数据 - 左侧
    const leftParameterList = $state([
        { name: "低压涡轮进口总压", selected: false },
        { name: "高压涡轮进口总压", selected: false },
        { name: "发动机进口总流量", selected: false },
        { name: "发动机进口净压阻力", selected: false },
        { name: "发动机总转速", selected: false },
        { name: "主燃烧室转速", selected: false },
        { name: "加力燃烧室转速", selected: false },
        { name: "风扇出口总压", selected: false },
        { name: "高压压气机出口温度", selected: false },
        { name: "高压涡轮进口温度", selected: false },
        { name: "低压涡轮进口温度", selected: false },
        { name: "低压涡轮出口温度", selected: false },
        { name: "风扇出口总压", selected: false },
        { name: "高压压气机出口总压", selected: false },
        { name: "高压涡轮出口总压", selected: false },
        { name: "低压涡轮出口总压", selected: false },
    ]);

    // 参数列表数据 - 右侧
    const rightParameterList = $state([
        { name: "发动机净马力", selected: false },
        { name: "发动机总马力", selected: false },
        { name: "循环装置面积", selected: false },
        { name: "循环装置总压", selected: false },
        { name: "循环出口总压", selected: false },
        { name: "循环装置温度", selected: false },
        { name: "循环出口温度", selected: false },
        { name: "循环装置流量温度", selected: false },
        { name: "循环出口流量", selected: false },
        { name: "循环装置总压", selected: false },
        { name: "循环出口总压", selected: false },
        { name: "循环装置流量温度", selected: false },
        { name: "循环出口流量", selected: false },
        { name: "循环压力损失系数", selected: false },
        { name: "喷管出口速度", selected: false },
    ]);

    // uPlot图表数据存储 - 每个图表一个数据集，修改为20个数据点
    let chartDataSets = $state<Map<number, { name: string; data: number[][] }>>(
        new Map(),
    );
    let simulationTimer: number | null = null;
    let currentTime = $state(0);

    // 实时监控表格数据
    let monitorTableData = $state<Array<{ parameter: string; value: string }>>(
        [],
    );

    // 辅助函数：打印当前所有图表数据（用于调试）
    function logAllDataCharts() {
        console.log("=== 当前所有图表数据 ===");
        chartDataSets.forEach((data, id) => {
            console.log(`data_chart_${id}:`, data);
        });
        console.log("========================");
    }

    // 油门杆角度SVG控制器 - 修复交互功能
    function handleThrottleMouseDown(event: MouseEvent) {
        isDraggingThrottle = true;
        throttleContainer = event.currentTarget as HTMLElement;
        updateThrottleValue(event);
        event.preventDefault();
    }

    function handleThrottleMouseMove(event: MouseEvent) {
        if (!isDraggingThrottle || !throttleContainer) return;
        updateThrottleValue(event);
        event.preventDefault();
    }

    function handleThrottleMouseUp() {
        isDraggingThrottle = false;
        throttleContainer = null;
    }

    function updateThrottleValue(event: MouseEvent) {
        if (!throttleContainer) return;

        const rect = throttleContainer.getBoundingClientRect();
        const y = event.clientY - rect.top;

        // SVG高度为381，有效控制范围从4到376（对应120到0度）
        const svgHeight = 381;
        const minY = 4;
        const maxY = 376;
        const clampedY = Math.max(minY, Math.min(maxY, y));

        // 计算角度值：y=4对应120度，y=376对应0度
        const percentage = (clampedY - minY) / (maxY - minY);
        throttleValue = 120 - percentage * 120;

    }

    // 调用后端计算函数
    async function callSteadyStateCalculation(data: any) {
        try {
            const result = await invoke("fdj_execute", data);

            return result;
        } catch (error) {
            console.error("计算调用失败:", error);
            // 如果调用失败，返回模拟结果作为后备
            return {
                success: false,
                message: "计算失败，返回模拟结果",
                dataOut: null,
            };
        }
    }

    // 调用后端实时计算函数
    async function callRealtimeCalculation() {
        try {
            const data = {
                input_data: dataIn,
                function_type: "Pilot",
            };

            console.log("发送到后端的数据:", data);

            // 调用后端计算函数
            const result = await callSteadyStateCalculation(data);
            console.log("计算返回结果:", result);
        } catch (error) {
            console.error("后端调用失败:", error);
        }
    }

    // 生成模拟实时数据 - dataOut格式样例
    function generateMockRealtimeData() {
        const mockData = [
            {
                name: "低压涡轮出口温度",
                data: [756 + (Math.random() - 0.5) * 50],
            },
            { name: "风扇出口总压", data: [245 + (Math.random() - 0.5) * 20] },
            {
                name: "高压压气机出口总压",
                data: [1245 + (Math.random() - 0.5) * 100],
            },
            {
                name: "低压涡轮出口总压",
                data: [756 + (Math.random() - 0.5) * 80],
            },
            {
                name: "高压涡轮出口总压",
                data: [1120 + (Math.random() - 0.5) * 120],
            },
            {
                name: "高压压气机出口温度",
                data: [1245 + (Math.random() - 0.5) * 150],
            },
            {
                name: "高压涡轮进口温度",
                data: [1156 + (Math.random() - 0.5) * 100],
            },
            {
                name: "低压涡轮进口温度",
                data: [945 + (Math.random() - 0.5) * 80],
            },
            {
                name: "喷管出口速度",
                data: [1245 + (Math.random() - 0.5) * 200],
            },
            {
                name: "发动机净马力",
                data: [1200 + (Math.random() - 0.5) * 200],
            },
            {
                name: "发动机总马力",
                data: [1400 + (Math.random() - 0.5) * 150],
            },
            { name: "time", data: [currentTime] },
        ];

        console.log("生成模拟数据:", mockData);
        return mockData;
    }

    // 更新uPlot图表数据
    function updateUPlotChartsFromDataOut(
        dataOutResult: Array<{ name: string; data: number[] }>,
    ) {
        dataOut = dataOutResult;
        console.log("开始更新uPlot图表数据，dataOut:", dataOut);

        // 获取时间数据
        const timeData = dataOut.find((d) => d.name === "time");
        const currentTimeValue = timeData ? timeData.data[0] : currentTime;

        // 遍历curveCharts数组中的每个图表对象
        curveCharts.forEach((chart) => {
            console.log(
                `处理图表 ${chart.name}，曲线:`,
                chart.curves.map((c) => c.name),
            );

            // 构建data_chart_{id}格式的数据
            const data_chart: { name: string; data: number[] } = {
                name: chart.name,
                data: [currentTimeValue], // 第一个元素是时间
            };

            // 添加每条曲线的数据
            chart.curves.forEach((curve) => {
                const curveData = dataOut.find((d) => d.name === curve.name);
                if (curveData && curveData.data.length > 0) {
                    data_chart.data.push(curveData.data[0]);
                } else {
                    // 如果没有找到数据，使用默认值
                    data_chart.data.push(Math.random() * 1000 + 500);
                    console.log(`曲线 ${curve.name} 没有找到数据，使用默认值`);
                }
            });

            console.log(`图表 ${chart.name} 生成数据:`, data_chart);

            // 获取现有的图表数据集
            let existingDataSet = chartDataSets.get(chart.id);

            if (!existingDataSet) {
                // 初始化新的数据集
                existingDataSet = {
                    name: chart.name,
                    data: [],
                };
            }

            // 添加新的数据点
            existingDataSet.data.push(data_chart.data);

            // 保持固定的20个数据点窗口（修改从100改为20）
            if (existingDataSet.data.length > 20) {
                existingDataSet.data = existingDataSet.data.slice(-20);
            }

            // 更新数据集
            chartDataSets.set(chart.id, existingDataSet);

            // 调试输出：显示当前data_chart_{id}的内容
            console.log(`data_chart_${chart.id} 当前状态:`, existingDataSet);
        });

        // 触发响应式更新
        chartDataSets = new Map(chartDataSets);
        console.log("uPlot图表数据更新完成，当前chartDataSets:", chartDataSets);

        // 调试：打印所有图表数据
        logAllDataCharts();
    }

    // 更新监控表格数据
    function updateMonitorTableData(
        dataOutResult: Array<{ name: string; data: number[] }>,
    ) {
        monitorTableData = dataOutResult
            .filter((item) => item.name !== "time")
            .map((item) => ({
                parameter: item.name,
                value: item.data.length > 0 ? item.data[0].toFixed(3) : "0.000",
            }));
    }

    // 初始化图表数据
    function initializeChartData(chartId: number) {
        const chart = curveCharts.find((c) => c.id === chartId);
        if (chart) {
            chartDataSets.set(chartId, {
                name: chart.name,
                data: [],
            });
        }
    }

    async function handleStart() {
        if (isPaused) {
            isPaused = false;
            isCalculating = true;
            return;
        }

        isCalculating = true;
        currentTime = 0;
        dataIn = [];

        updateDataINOptions();

        try {
            const initialData = await callRealtimeCalculation();
            console.log("首次后端调用成功:", initialData);

            const data = Array.isArray(initialData)
                ? initialData
                : generateMockRealtimeData();

            updateUPlotChartsFromDataOut(data);
            updateMonitorTableData(data);
        } catch (error) {
            console.error("首次后端调用失败:", error);
        }

        showResults = true;
        showMonitorModal = true;

        curveCharts.forEach((chart) => {
            if (!chartDataSets.has(chart.id)) {
                initializeChartData(chart.id);
            }
        });

        // 清除旧定时器（防止重复开启）
        if (simulationTimer) clearInterval(simulationTimer);

        // 每隔 25ms 请求后端数据
        simulationTimer = setInterval(async () => {
            if (isPaused || !isCalculating) return;

            const newData = await callRealtimeCalculation().catch((err) => {
                console.error("后端请求失败:", err);
                return;
            });

            updateUPlotChartsFromDataOut(newData);
            updateMonitorTableData(newData);
        }, 25);
    }

    function handlePause() {
        isPaused = true;
        isCalculating = false;

        // 停止实时数据更新
        if (simulationTimer) {
            clearInterval(simulationTimer);
            simulationTimer = null;
        }
    }

    function handleReset() {
        // 停止所有计算和定时器
        showResults = false;
        isCalculating = false;
        isPaused = false;
        showMonitorModal = false;

        // 停止实时数据更新
        if (simulationTimer) {
            clearInterval(simulationTimer);
            simulationTimer = null;
        }

        // 清理图表数据
        chartDataSets.clear();
        dataOut = [];
        monitorTableData = [];
        currentTime = 0;

        // 重置dataIn到初始状态
        dataIn = [
            { name: "仿真步长", data: [0.025] },
            { name: "作战", data: [1] },
            { name: "训练", data: [0] },
            { name: "地面", data: [1] },
            { name: "空中", data: [0] },
            { name: "高度", data: [0] },
            { name: "马赫数", data: [0] },
            { name: "温度修正", data: [0] },
            { name: "进气道总压恢复系数", data: [-1] },
            { name: "功率提取", data: [0] },
            { name: "压气机出口座舱引气", data: [0] },
            { name: "油门杆角度", data: [66.66] },
        ];

        // 重置存储路径
        storagePath = "";

        // 重置油门杆角度
        throttleValue = 66.66;

        // 重置用户选择到初始状态
        selectedSimulationStep = "0.025";
        selectedMode = "作战";
        selectedEnvironment = "地面";

        // 重置参数列表选择状态
        leftParameterList.forEach((p) => (p.selected = false));
        rightParameterList.forEach((p) => (p.selected = false));

        // 重置模态框位置
        monitorModalPosition = { x: 200, y: 150 };
        monitorModalSize = { width: 400, height: 500 };

        console.log("所有数据和用户选择已重置到初始状态");
    }

    function handleDownload() {
        if (!storagePath) {
            alert("请输入存储路径");
            return;
        }

        // 将实时数据保存到指定路径
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                dataIn: dataIn,
                dataOut: dataOut,
                chartData: Array.from(chartDataSets.entries()).map(
                    ([id, data]) => ({
                        chartId: id,
                        chartName:
                            curveCharts.find((c) => c.id === id)?.name ||
                            `图表-${id}`,
                        data: data,
                    }),
                ),
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `realtime_data_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert(`数据已下载到: ${storagePath}`);
        } catch (error) {
            console.error("数据下载失败:", error);
            alert("数据下载失败");
        }
    }

    // 处理曲线图变化
    function handleChartsChange(newCharts: typeof curveCharts) {
        curveCharts = newCharts;
        // 为新图表初始化数据
        curveCharts.forEach((chart) => {
            if (!chartDataSets.has(chart.id)) {
                initializeChartData(chart.id);
            }
        });
    }

    // 打开监控弹窗
    function openMonitorModal() {
        showMonitorModal = true;
    }

    // 组件销毁时清理
    $effect(() => {
        return () => {
            if (simulationTimer) {
                clearInterval(simulationTimer);
            }
        };
    });

    // 初始化所有现有图表的空数据
    $effect(() => {
        curveCharts.forEach((chart) => {
            if (!chartDataSets.has(chart.id)) {
                initializeChartData(chart.id);
            }
        });
    });

    // 监听选择变化，自动更新dataIn
    $effect(() => {
        updateDataINOptions();
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

<div class="max-h-screen overflow-auto bg-gray-900 p-4 sm:p-6 lg:p-8">
    <div class="w-full mx-auto h-full">
        <div class="flex flex-col xl:flex-row h-full gap-4">
            <!-- 左侧曲线组面板 - 使用封装的组件 -->
            <CurveChartManager
                bind:charts={curveCharts}
                leftParameters={leftParameterList}
                rightParameters={rightParameterList}
                onChartsChange={handleChartsChange}
            />

            <!-- 中间图表区域 - 使用uPlot图表 -->
            <div class="flex-1 max-h-screen mb-10 overflow-y-auto">
                <!-- 图表展示区域 - 使用Grid布局确保整齐划一 -->
                <div class="grid grid-cols-1 gap-6">
                    {#each curveCharts as chart (chart.id)}
                        <div
                            class="bg-gray-800 border border-gray-700 p-4 shadow-lg"
                        >
                            <!-- 图表标题 - 统一样式，删除数据点、显示窗口、曲线数信息 -->
                            <div class="flex justify-between items-center mb-4">
                                <h3
                                    class="text-lg font-semibold text-gray-200 flex items-center gap-2"
                                >
                                    <svg
                                        class="w-5 h-5 text-blue-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                        ></path>
                                    </svg>
                                    {chart.name}
                                </h3>
                                <!-- 删除右侧的数据统计信息 -->
                            </div>

                            <!-- uPlot图表容器 -->
                            <div class="bg-gray-900 p-4 border border-gray-600">
                                <UPlotChart
                                    chartId={chart.id}
                                    chartName={chart.name}
                                    curves={chart.curves}
                                    data={chartDataSets.get(chart.id)?.data ||
                                        []}
                                />
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- 右侧控制面板 - 整体面板，中间竖线分隔 -->
            <div
                class="w-full lg:w-80 bg-gray-800 border border-gray-700 flex flex-col"
            >
                <!-- 存储路径 -->
                <div class="p-4 border-b border-gray-700">
                    <div class="flex items-center gap-2">
                        <label class="text-xs text-gray-300 flex-shrink-0"
                            >存储路径</label
                        >
                        <input
                            type="text"
                            bind:value={storagePath}
                            placeholder="输入存储路径"
                            class="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                        />
                        <button
                            class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                            onclick={handleDownload}
                        >
                            ⬇
                        </button>
                    </div>
                </div>

                <!-- 开始和重置按钮 - 更新颜色 -->
                <div class="p-4 border-b border-gray-700">
                    <div class="flex gap-2">
                        {#if isCalculating}
                            <!-- 暂停按钮 - 灰色 -->
                            <button
                                class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                                onclick={handlePause}
                            >
                                暂停
                            </button>
                        {:else if isPaused}
                            <!-- 继续按钮 - 黄色 -->
                            <button
                                class="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                                onclick={handleStart}
                            >
                                继续
                            </button>
                        {:else}
                            <!-- 开始按钮 - 绿色 -->
                            <button
                                class="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                                onclick={handleStart}
                            >
                                开始
                            </button>
                        {/if}
                        <!-- 重置按钮 - 橙色 -->
                        <button
                            class="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                            onclick={handleReset}
                        >
                            重置
                        </button>
                    </div>
                </div>

                <!-- 仿真步长、模式选择 -->
                <div class="p-4 border-b border-gray-700">
                    <SwitcherGroup bind:selectedData={switcherData} />
                </div>

                <!-- 油门杆角度和输入参数 - 增加高度，修复显示问题 -->
                <div class="p-4 flex-1 overflow-visible">
                    <div class="flex items-start gap-4 h-full">
                        <!-- 左侧：油门杆角度SVG控制器 - 修复交互 -->
                        <div class="flex-shrink-0">
                            <h3 class="text-xs text-gray-300 mb-3">
                                油门杆角度
                            </h3>
                            <div class="relative">
                                <!-- SVG油门杆控制器容器 - 添加容器引用 -->
                                <div
                                    class="cursor-pointer select-none {isDraggingThrottle
                                        ? 'cursor-grabbing'
                                        : 'cursor-grab'}"
                                    onmousedown={handleThrottleMouseDown}
                                    style="width: 50px; height: 381px;"
                                    bind:this={throttleContainer}
                                >
                                    <!-- SVG背景 - 基于Frame3183.svg -->
                                    <svg
                                        width="50"
                                        height="381"
                                        viewBox="0 0 50 381"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        class="absolute inset-0"
                                    >
                                        <!-- 刻度数字 -->
                                        <text
                                            x="-1"
                                            y="9"
                                            fill="white"
                                            fill-opacity="0.7"
                                            font-size="12">120</text
                                        >
                                        <text
                                            x="-1"
                                            y="70"
                                            fill="white"
                                            fill-opacity="0.7"
                                            font-size="12">100</text
                                        >
                                        <text
                                            x="3"
                                            y="132"
                                            fill="white"
                                            fill-opacity="0.7"
                                            font-size="12">80</text
                                        >
                                        <text
                                            x="3"
                                            y="194"
                                            fill="white"
                                            fill-opacity="0.7"
                                            font-size="12">60</text
                                        >
                                        <text
                                            x="3"
                                            y="256"
                                            fill="white"
                                            fill-opacity="0.7"
                                            font-size="12">40</text
                                        >
                                        <text
                                            x="3"
                                            y="318"
                                            fill="white"
                                            fill-opacity="0.7"
                                            font-size="12">20</text
                                        >
                                        <text
                                            x="8"
                                            y="380"
                                            fill="white"
                                            fill-opacity="0.7"
                                            font-size="12">0</text
                                        >

                                        <!-- 主刻度线 -->
                                        <line
                                            x1="22.5"
                                            y1="4"
                                            x2="32.5"
                                            y2="4"
                                            stroke="white"
                                            stroke-opacity="0.7"
                                        />
                                        <line
                                            x1="22.5"
                                            y1="66"
                                            x2="32.5"
                                            y2="66"
                                            stroke="white"
                                            stroke-opacity="0.7"
                                        />
                                        <line
                                            x1="22.5"
                                            y1="128"
                                            x2="32.5"
                                            y2="128"
                                            stroke="white"
                                            stroke-opacity="0.7"
                                        />
                                        <line
                                            x1="22.5"
                                            y1="190"
                                            x2="32.5"
                                            y2="190"
                                            stroke="white"
                                            stroke-opacity="0.7"
                                        />
                                        <line
                                            x1="22.5"
                                            y1="252"
                                            x2="32.5"
                                            y2="252"
                                            stroke="white"
                                            stroke-opacity="0.7"
                                        />
                                        <line
                                            x1="22.5"
                                            y1="314"
                                            x2="32.5"
                                            y2="314"
                                            stroke="white"
                                            stroke-opacity="0.7"
                                        />
                                        <line
                                            x1="22.5"
                                            y1="376"
                                            x2="32.5"
                                            y2="376"
                                            stroke="white"
                                            stroke-opacity="0.7"
                                        />

                                        <!-- 小刻度线 -->
                                        {#each Array(30) as _, i}
                                            {@const y = 4 + i * 12.4}
                                            {#if y <= 376 && (y - 4) % 62 !== 0}
                                                <line
                                                    x1="22.5"
                                                    y1={y}
                                                    x2="27.5"
                                                    y2={y}
                                                    stroke="white"
                                                    stroke-opacity="0.7"
                                                    stroke-width="0.5"
                                                />
                                            {/if}
                                        {/each}

                                        <!-- 滑轨背景 -->
                                        <rect
                                            x="37.5"
                                            y="2.5"
                                            width="3"
                                            height="376"
                                            rx="1.5"
                                            fill="#141414"
                                        />
                                    </svg>

                                    <!-- 可拖动的蓝色滑块 -->
                                    {#each [throttleValue] as value}
                                        {@const percentage =
                                            (120 - value) / 120}
                                        {@const sliderY = 4 + percentage * 372}
                                        <div
                                            class="absolute pointer-events-none"
                                            style="top: {sliderY -
                                                5.5}px; left: 36.5px;"
                                        >
                                            <!-- 滑块主体 -->
                                            <div
                                                class="w-1 h-3 bg-blue-500 rounded-sm"
                                            ></div>
                                            <!-- 滑块手柄 -->
                                            <div
                                                class="absolute -left-2.5 top-0.5 w-6 h-2 bg-gray-800 border border-blue-500 rounded-sm flex items-center justify-center"
                                            >
                                                <div
                                                    class="w-3 h-0.5 bg-blue-500 rounded"
                                                ></div>
                                            </div>
                                        </div>
                                    {/each}
                                </div>

                                <!-- 当前值显示 -->
                                <div class="text-center mt-2">
                                    <span class="text-xs text-white font-mono"
                                        >{throttleValue.toFixed(2)}°</span
                                    >
                                </div>
                            </div>
                        </div>

                        <!-- 竖线分隔 -->
                        <div class="w-px bg-gray-600 h-full"></div>

                        <!-- 右侧：输入参数 - 上下布局 -->
                        <ParamsInputGroup bind:paramLabels={parameterLabels} />
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







