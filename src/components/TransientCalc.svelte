<script lang="ts">
  let isCalculating = $state(false);
  let showResults = $state(false);
  let showCharts = $state(false);
  let selectedFile = $state<File | null>(null);
  let csvData = $state<string[][]>([]);

  // 曲线组数据 - 每个曲线组显示三个曲线
  const curveGroups = [
    {
      name: '曲线组-1',
      curves: [
        { name: '高压涡轮出口总压', selected: true },
        { name: '高压压气机出口总压', selected: true },
        { name: '低压涡轮出口总压', selected: true }
      ]
    },
    {
      name: '曲线组-2',
      curves: [
        { name: '高压涡轮出口总压', selected: true },
        { name: '高压压气机出口总压', selected: true },
        { name: '低压涡轮出口总压', selected: true }
      ]
    },
    {
      name: '曲线组-3',
      curves: [
        { name: '高压涡轮出口总压', selected: true },
        { name: '高压压气机出口总压', selected: true },
        { name: '低压涡轮出口总压', selected: true }
      ]
    }
  ];

  // 模拟CSV数据
  const sampleCsvData = [
    ['时间/s', '0', '0', '0', '0', '0', '0', '0'],
    ['高度/m', '22000.00', '22000.00', '22000.00', '22000.00', '22000.00', '22000.00', '22000.00'],
    ['马赫数', '1.33', '1.33', '1.33', '1.33', '1.33', '1.33', '1.33'],
    ['温度修正/K', '300.66', '300.66', '300.66', '300.66', '300.66', '300.66', '300.66'],
    ['进气道压力传递系统', '2000000.00', '2000000.00', '2000000.00', '2000000.00', '2000000.00', '2000000.00', '2000000.00'],
    ['功率规律/W', '300.55', '300.55', '300.55', '300.55', '300.55', '300.55', '300.55'],
    ['压气机进口压阻引气%', '114.33', '114.33', '114.33', '114.33', '114.33', '114.33', '114.33'],
    ['油门杆角度/deg', '66.6', '66.6', '66.6', '66.6', '66.6', '66.6', '66.6'],
    ['模式', '作线', '作线', '作线', '作线', '作线', '作线', '作线'],
    ['状态', '地面', '地面', '地面', '地面', '地面', '地面', '地面']
  ];

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      selectedFile = input.files[0];
      // 模拟读取CSV文件
      csvData = sampleCsvData;
      showResults = true;
    }
  }

  async function handleCalculate() {
    if (!selectedFile && csvData.length === 0) {
      alert('请先选择文件');
      return;
    }
    
    isCalculating = true;
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500));
    showCharts = true;
    isCalculating = false;
  }

  // 生成精密曲线数据
  function generatePrecisionCurveData(points = 300) {
    const data = [];
    for (let i = 0; i < points; i++) {
      const time = i * 0.03;
      data.push({
        time,
        value1: 18 + Math.sin(time * 0.3) * 3 + Math.cos(time * 0.7) * 2 + Math.random() * 0.5,
        value2: 12 + Math.cos(time * 0.4) * 2.5 + Math.sin(time * 0.6) * 1.5 + Math.random() * 0.4,
        value3: 8 + Math.sin(time * 0.2) * 2 + Math.cos(time * 0.8) * 1.8 + Math.random() * 0.3
      });
    }
    return data;
  }

  // 生成完整长曲线数据
  function generateFullCurveData(points = 2000) {
    const data = [];
    for (let i = 0; i < points; i++) {
      const time = i * 0.005;
      data.push({
        time,
        value1: 18 + Math.sin(time * 0.1) * 3 + Math.cos(time * 0.3) * 2 + Math.random() * 0.5,
        value2: 12 + Math.cos(time * 0.15) * 2.5 + Math.sin(time * 0.25) * 1.5 + Math.random() * 0.4,
        value3: 8 + Math.sin(time * 0.08) * 2 + Math.cos(time * 0.35) * 1.8 + Math.random() * 0.3
      });
    }
    return data;
  }

  const precisionCurveData = generatePrecisionCurveData();
  const fullCurveData = generateFullCurveData();

  // 选择区域状态
  let selectionStart = $state(0.3);
  let selectionEnd = $state(0.7);
  let isDragging = $state(false);
  let dragType = $state<'start' | 'end' | 'middle' | null>(null);
  let dragElement = $state<HTMLElement | null>(null);

  // 处理拖拽
  function handleMouseDown(event: MouseEvent, type: 'start' | 'end' | 'middle') {
    isDragging = true;
    dragType = type;
    // 找到包含缩略图的父元素
    dragElement = (event.currentTarget as HTMLElement).closest('.relative.h-10') as HTMLElement;
    event.preventDefault();
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isDragging || !dragType || !dragElement) return;
    
    const rect = dragElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const clampedX = Math.max(0, Math.min(1, x));
    
    if (dragType === 'start') {
      selectionStart = Math.min(clampedX, selectionEnd - 0.05);
    } else if (dragType === 'end') {
      selectionEnd = Math.max(clampedX, selectionStart + 0.05);
    } else if (dragType === 'middle') {
      const width = selectionEnd - selectionStart;
      const newStart = Math.max(0, Math.min(1 - width, clampedX - width / 2));
      selectionStart = newStart;
      selectionEnd = newStart + width;
    }
  }

  function handleMouseUp() {
    isDragging = false;
    dragType = null;
    dragElement = null;
  }
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div class="h-[calc(100vh-120px)] bg-gray-900">
  {#if showCharts}
    <!-- 图表视图 -->
    <div class="flex h-full">
      <!-- 左侧曲线组面板 -->
      <div class="w-48 bg-gray-800 border-r border-gray-700 overflow-y-auto">
        {#each curveGroups as group}
          <div class="border-b border-gray-700">
            <!-- 曲线组标题 -->
            <div class="flex items-center justify-between p-2 bg-gray-750">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                <span class="text-sm text-gray-300">{group.name}</span>
              </div>
            </div>
            
            <!-- 曲线列表 - 只显示名称，无复选框 -->
            <div class="p-2 space-y-1">
              {#each group.curves as curve}
                <div class="text-xs text-gray-300 leading-tight px-2 py-1">
                  {curve.name}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <!-- 右侧图表区域 - 2列布局 -->
      <div class="flex-1 p-4 overflow-auto">
        <div class="grid grid-cols-2 gap-4">
          {#each curveGroups as group, groupIndex}
            <div class="bg-black rounded border border-gray-700 p-3">
              <!-- 图表标题 -->
              <div class="flex justify-between items-center mb-2">
                <h3 class="text-sm text-gray-300">{group.name}</h3>
                <div class="flex gap-1">
                  <button class="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-xs flex items-center justify-center">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                    </svg>
                  </button>
                  <button class="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-xs flex items-center justify-center">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- 上方精密曲线图 - 显示选取的部分，展示三条曲线 -->
              <div class="h-56 bg-black rounded relative overflow-hidden mb-3 border border-gray-800">
                <!-- Y轴刻度标签 -->
                <div class="absolute left-1 top-2 text-xs text-gray-400 font-mono">25.0</div>
                <div class="absolute left-1 top-8 text-xs text-gray-400 font-mono">20.0</div>
                <div class="absolute left-1 top-16 text-xs text-gray-400 font-mono">15.0</div>
                <div class="absolute left-1 top-24 text-xs text-gray-400 font-mono">10.0</div>
                <div class="absolute left-1 top-32 text-xs text-gray-400 font-mono">5.0</div>
                <div class="absolute left-1 top-40 text-xs text-gray-400 font-mono">0.0</div>
                <div class="absolute left-1 bottom-16 text-xs text-gray-400 font-mono">-5.0</div>

                <!-- X轴刻度标签 -->
                <div class="absolute bottom-1 left-8 right-8 flex justify-between text-xs text-gray-400 font-mono">
                  <span>January</span>
                  <span>February</span>
                  <span>March</span>
                  <span>April</span>
                  <span>May</span>
                  <span>June</span>
                  <span>July</span>
                  <span>August</span>
                  <span>September</span>
                </div>

                <!-- 精密曲线图 SVG -->
                <svg class="w-full h-full" viewBox="0 0 500 240">
                  <!-- 精密网格线 - 主网格 -->
                  {#each Array(13) as _, i}
                    <line 
                      x1="35" 
                      y1={20 + i * 16} 
                      x2="480" 
                      y2={20 + i * 16} 
                      stroke="#374151" 
                      stroke-width="0.8" 
                      opacity="0.6"
                    />
                  {/each}
                  {#each Array(20) as _, i}
                    <line 
                      x1={35 + i * 22.25} 
                      y1="20" 
                      x2={35 + i * 22.25} 
                      y2="212" 
                      stroke="#374151" 
                      stroke-width="0.8" 
                      opacity="0.6"
                    />
                  {/each}

                  <!-- 次网格线 -->
                  {#each Array(65) as _, i}
                    <line 
                      x1="35" 
                      y1={20 + i * 3.2} 
                      x2="480" 
                      y2={20 + i * 3.2} 
                      stroke="#374151" 
                      stroke-width="0.3" 
                      opacity="0.3"
                    />
                  {/each}
                  {#each Array(80) as _, i}
                    <line 
                      x1={35 + i * 5.56} 
                      y1="20" 
                      x2={35 + i * 5.56} 
                      y2="212" 
                      stroke="#374151" 
                      stroke-width="0.3" 
                      opacity="0.3"
                    />
                  {/each}

                  <!-- 显示三条精密曲线 -->
                  {#each [precisionCurveData] as data}
                    {@const startIndex = Math.floor(selectionStart * data.length)}
                    {@const endIndex = Math.floor(selectionEnd * data.length)}
                    {@const selectedData = data.slice(startIndex, endIndex)}
                    
                    <!-- 第一条曲线 -->
                    <polyline
                      fill="none"
                      stroke="#fbbf24"
                      stroke-width="1.2"
                      points={selectedData.map((d, i) => {
                        const x = 35 + (i / (selectedData.length - 1)) * 445;
                        const y = 212 - ((d.value1 + 5) / 30) * 192;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    
                    <!-- 第二条曲线 -->
                    <polyline
                      fill="none"
                      stroke="#f97316"
                      stroke-width="1.2"
                      points={selectedData.map((d, i) => {
                        const x = 35 + (i / (selectedData.length - 1)) * 445;
                        const y = 212 - ((d.value2 + 5) / 30) * 192;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    
                    <!-- 第三条曲线 -->
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      stroke-width="1.2"
                      points={selectedData.map((d, i) => {
                        const x = 35 + (i / (selectedData.length - 1)) * 445;
                        const y = 212 - ((d.value3 + 5) / 30) * 192;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  {/each}

                  <!-- 坐标轴 -->
                  <line x1="35" y1="20" x2="35" y2="212" stroke="#6b7280" stroke-width="1.5"/>
                  <line x1="35" y1="212" x2="480" y2="212" stroke="#6b7280" stroke-width="1.5"/>
                </svg>
              </div>

              <!-- 下方长曲线图 - 可选取部分 -->
              <div class="h-20 bg-gray-900 rounded p-2 border border-gray-700">
                <div class="text-xs text-gray-300 mb-1">Zoom Band Chart</div>
                <div class="flex justify-between text-xs text-gray-400 mb-1 font-mono">
                  <span>2001</span>
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>2002</span>
                  <span>May</span>
                  <span>Jun</span>
                  <span>Jul</span>
                  <span>Aug</span>
                  <span>Sep</span>
                  <span>Oct</span>
                  <span>Nov</span>
                  <span>Dec</span>
                  <span>2003</span>
                </div>
                <div 
                  class="relative h-10 bg-gray-800 rounded overflow-hidden cursor-pointer"
                  onmousedown={(e) => handleMouseDown(e, 'middle')}
                >
                  <!-- 完整长曲线的缩略图 - 显示三条曲线 -->
                  <svg class="w-full h-full" viewBox="0 0 500 40">
                    <!-- 缩略图网格 -->
                    {#each Array(5) as _, i}
                      <line x1="0" y1={i * 10} x2="500" y2={i * 10} stroke="#374151" stroke-width="0.5" opacity="0.2"/>
                    {/each}
                    
                    <!-- 三条完整曲线 -->
                    <polyline
                      fill="none"
                      stroke="#fbbf24"
                      stroke-width="0.8"
                      points={fullCurveData.slice(0, 500).map((d, i) => `${i},${40 - ((d.value1 - 10) / 15) * 40}`).join(' ')}
                    />
                    <polyline
                      fill="none"
                      stroke="#f97316"
                      stroke-width="0.8"
                      points={fullCurveData.slice(0, 500).map((d, i) => `${i},${40 - ((d.value2 - 5) / 15) * 40}`).join(' ')}
                    />
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      stroke-width="0.8"
                      points={fullCurveData.slice(0, 500).map((d, i) => `${i},${40 - ((d.value3 - 3) / 15) * 40}`).join(' ')}
                    />
                  </svg>
                  
                  <!-- 选择区域 - 显示当前选取的部分 -->
                  <div 
                    class="absolute top-0 bottom-0 bg-yellow-500 opacity-20 border-l-2 border-r-2 border-yellow-400"
                    style="left: {selectionStart * 100}%; right: {(1 - selectionEnd) * 100}%;"
                    onmousedown={(e) => handleMouseDown(e, 'middle')}
                  ></div>
                  
                  <!-- 左拖拽手柄 -->
                  <div 
                    class="absolute top-0 bottom-0 w-2 bg-yellow-500 cursor-ew-resize hover:bg-yellow-400 transition-colors"
                    style="left: {selectionStart * 100}%;"
                    onmousedown={(e) => handleMouseDown(e, 'start')}
                  ></div>
                  
                  <!-- 右拖拽手柄 -->
                  <div 
                    class="absolute top-0 bottom-0 w-2 bg-yellow-500 cursor-ew-resize hover:bg-yellow-400 transition-colors"
                    style="left: {selectionEnd * 100}%;"
                    onmousedown={(e) => handleMouseDown(e, 'end')}
                  ></div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <!-- 数据表格视图 -->
    <div class="p-6">
      <!-- 顶部控制区域 -->
      <div class="flex justify-between items-center mb-6">
        <!-- 文件上传区域 -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-gray-300">
            <span class="text-lg">📁</span>
            <span class="text-sm">从文件中加载</span>
          </div>
          <div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              class="hidden"
              id="file-upload"
              onchange={handleFileSelect}
            />
            <label
              for="file-upload"
              class="block px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded cursor-pointer transition-colors border border-gray-600"
            >
              {selectedFile ? selectedFile.name : '选择文件'}
            </label>
          </div>
        </div>

        <!-- 计算按钮 -->
        <button
          class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={handleCalculate}
          disabled={isCalculating}
        >
          {isCalculating ? '计算中...' : '计算'}
        </button>
      </div>

      <!-- 结果表格 -->
      <div class="bg-gray-800 rounded border border-gray-700 overflow-hidden h-[calc(100%-100px)]">
        {#if showResults && csvData.length > 0}
          <div class="overflow-auto h-full">
            <table class="w-full text-sm">
              <!-- 表头 -->
              <thead class="bg-gray-700 sticky top-0">
                <tr>
                  <th class="px-4 py-3 text-left font-medium text-gray-200 border-r border-gray-600 min-w-[200px]">参数</th>
                  {#each csvData[0].slice(1) as header, i}
                    <th class="px-4 py-3 text-center font-medium text-gray-200 border-r border-gray-600 min-w-[100px]">{i + 1}</th>
                  {/each}
                  <th class="px-4 py-3 text-center font-medium text-gray-200">
                    <button class="text-green-500 hover:text-green-400 text-lg font-bold">+</button>
                  </th>
                </tr>
              </thead>
              
              <!-- 数据行 -->
              <tbody>
                {#each csvData as row, rowIndex}
                  <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td class="px-4 py-3 text-gray-300 font-medium border-r border-gray-600">{row[0]}</td>
                    {#each row.slice(1) as cell}
                      <td class="px-4 py-3 text-center text-white border-r border-gray-600">{cell}</td>
                    {/each}
                    <td class="px-4 py-3"></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <div class="flex items-center justify-center h-full text-gray-400">
            <div class="text-center">
              <div class="text-6xl mb-4">📂</div>
              <p class="text-lg">上传CSV文件查看数据</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>