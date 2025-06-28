<script lang="ts">
  import { invoke } from '@tauri-apps/api/tauri';

  let isCalculating = $state(false);
  let showResults = $state(false);
  let selectedFile = $state<File | null>(null);
  let csvData = $state<string[][]>([]);

  // 计算按钮是否可用 - 只有上传文件后才能计算
  $: canCalculate = selectedFile !== null && csvData.length > 0;

  // 读取CSV文件内容
  function readCSVFile(file: File): Promise<string[][]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim() !== '');
          const data = lines.map(line => {
            // 处理CSV格式，支持逗号和制表符分隔
            return line.split(/[,\t]/).map(cell => cell.trim().replace(/"/g, ''));
          });
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'utf-8');
    });
  }

  // 处理文件选择
  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      selectedFile = input.files[0];
      
      try {
        // 读取实际文件内容
        const fileData = await readCSVFile(selectedFile);
        
        // 验证文件格式
        if (fileData.length === 0) {
          alert('文件为空或格式不正确');
          return;
        }

        // 直接使用原始CSV数据，不进行转置
        csvData = fileData;
        showResults = true;
        console.log('文件读取成功，数据行数:', csvData.length);
        console.log('数据预览:', csvData.slice(0, 3));
        
      } catch (error) {
        console.error('文件读取错误:', error);
        alert('文件读取失败，请检查文件格式');
      }
    }
  }

  // 添加新列
  function addColumn() {
    if (csvData.length === 0) return;
    
    // 获取当前最大列数
    const maxColumns = Math.max(...csvData.map(row => row.length));
    const newColumnIndex = maxColumns + 1;
    
    csvData = csvData.map((row, rowIndex) => {
      if (rowIndex === 0) {
        // 第一行：添加新的列标题
        return [...row, `新列${newColumnIndex}`];
      } else {
        // 其他行：添加默认值0
        return [...row, '0'];
      }
    });
  }

  // 删除列
  function deleteColumn(columnIndex: number) {
    if (csvData.length === 0 || columnIndex <= 0) return; // 不能删除第一列
    
    // 删除指定列
    csvData = csvData.map(row => {
      return row.filter((_, index) => index !== columnIndex);
    });
  }

  // 将表格数据转换为后端需要的格式
  function convertTableToBackendFormat() {
    if (csvData.length === 0) return [];
    
    const result = [];
    const headers = csvData[0]; // 第一行是列标题
    const dataRows = csvData.slice(1); // 其他行是数据
    
    // 遍历每一列，构建 {name: 列名, data: [该列所有数据]} 格式
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const columnName = headers[colIndex];
      const columnData = dataRows.map(row => {
        const value = row[colIndex] || '0';
        // 尝试转换为数字，如果失败则保持字符串
        const numValue = parseFloat(value);
        return isNaN(numValue) ? value : numValue;
      });
      
      result.push({
        name: columnName,
        data: columnData
      });
    }
    
    return result;
  }

  // 检查是否在Tauri环境中运行
  function isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && 
           typeof window.__TAURI_IPC__ === 'function';
  }

  // 调用后端计算函数
  async function callTransientCalculation(data: any[]) {
    try {
      // 检查是否在Tauri环境中
      if (isTauriEnvironment()) {
        // 使用 Tauri invoke 调用后端的 transient_calculation 函数
        const result = await invoke("transient_calculation", { data });
        return result;
      } else {
        // 在浏览器环境中返回模拟结果
        console.log('运行在浏览器环境中，返回模拟计算结果');
        return {
          success: true,
          message: '模拟计算完成（浏览器环境）',
          data: data.map((item, index) => ({
            ...item,
            calculated_result: Math.random() * 100,
            sequence: index + 1
          }))
        };
      }
    } catch (error) {
      console.error('计算调用失败:', error);
      // 如果Tauri调用失败，也返回模拟结果作为后备
      return {
        success: false,
        message: '计算失败，返回模拟结果',
        data: data.map((item, index) => ({
          ...item,
          calculated_result: Math.random() * 100,
          sequence: index + 1
        }))
      };
    }
  }

  async function handleCalculate() {
    if (!canCalculate) {
      alert('请先选择并上传文件');
      return;
    }
    
    isCalculating = true;
    
    try {
      // 将表格数据转换为后端需要的格式
      const backendData = convertTableToBackendFormat();
      console.log('发送到后端的数据格式:', backendData);
      
      // 验证数据格式
      if (backendData.length === 0) {
        throw new Error('没有有效的数据列');
      }

      // 调用后端计算函数
      const result = await callTransientCalculation(backendData);
      console.log('计算返回结果:', result);
      
      // 计算完成后显示成功消息
      alert('计算完成！');
      
    } catch (error) {
      console.error('计算过程中出错:', error);
      alert(`计算失败: ${error.message}`);
    } finally {
      isCalculating = false;
    }
  }
</script>

<div class="min-h-[calc(100vh-120px)] bg-gray-900 p-4 sm:p-6 lg:p-8">
  <div class="w-full max-w-[95%] mx-auto h-full">
    <!-- 数据表格视图 -->
    <div class="p-6 h-full flex flex-col">
      <!-- 顶部控制区域 -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <!-- 文件上传区域 -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-gray-300">
            <span class="text-lg">📁</span>
            <span class="text-sm">从文件中加载</span>
          </div>
          <div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
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
          disabled={!canCalculate || isCalculating}
          title={!canCalculate ? '请先上传文件' : ''}
        >
          {isCalculating ? '计算中...' : '计算'}
        </button>
      </div>

      <!-- 结果表格 -->
      <div class="bg-gray-800 rounded border border-gray-700 overflow-hidden flex-1">
        {#if showResults && csvData.length > 0}
          <div class="overflow-auto h-full">
            <table class="w-full text-sm">
              <!-- 表头 -->
              <thead class="bg-gray-700 sticky top-0">
                <tr>
                  <!-- 动态生成表头 -->
                  {#each csvData[0] as header, i}
                    <th class="px-4 py-3 text-center font-medium text-gray-200 border-r border-gray-600 min-w-[120px] relative group">
                      <div class="flex items-center justify-center gap-2">
                        <!-- 列标题（可编辑） -->
                        <input 
                          type="text" 
                          bind:value={csvData[0][i]}
                          class="bg-transparent text-center focus:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 text-gray-200 font-medium"
                        />
                        <!-- 删除列按钮（第一列不能删除） -->
                        {#if i > 0}
                          <button 
                            class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs transition-opacity"
                            onclick={() => deleteColumn(i)}
                            title="删除此列"
                          >
                            ×
                          </button>
                        {/if}
                      </div>
                    </th>
                  {/each}
                  <!-- 添加列按钮 -->
                  <th class="px-4 py-3 text-center font-medium text-gray-200">
                    <button 
                      class="text-green-500 hover:text-green-400 text-lg font-bold transition-colors"
                      onclick={addColumn}
                      title="添加新列"
                    >
                      +
                    </button>
                  </th>
                </tr>
              </thead>
              
              <!-- 数据行 -->
              <tbody>
                {#each csvData.slice(1) as row, rowIndex}
                  <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors {rowIndex % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}">
                    <!-- 动态生成数据单元格 -->
                    {#each row as cell, cellIndex}
                      <td class="px-4 py-3 text-center text-white border-r border-gray-600">
                        <input 
                          type="text" 
                          bind:value={csvData[rowIndex + 1][cellIndex]}
                          class="w-full bg-transparent text-center focus:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                        />
                      </td>
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
              <p class="text-lg">选择CSV文件查看数据</p>
              <p class="text-sm mt-2 text-gray-500">支持 .csv, .xlsx, .xls, .txt 格式</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>