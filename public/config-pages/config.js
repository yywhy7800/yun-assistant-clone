// 根据 config.schema.json 自动生成配置页面

console.log('[AutoConfig] auto-config.js loaded successfully');

function showConfirm(msg, onYes) {
  let overlay = document.getElementById('trl-confirm-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'trl-confirm-overlay';
    overlay.className = 'trl-confirm-overlay';
    overlay.innerHTML = `
      <div class="trl-confirm-panel">
        <div class="trl-confirm-msg" id="trl-confirm-msg"></div>
        <div class="trl-confirm-footer">
          <button type="button" class="trl-confirm-no">取消</button>
          <button type="button" class="trl-confirm-yes">确认</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('.trl-confirm-no').addEventListener('click', () => {
      overlay.style.display = 'none';
    });
  }
  document.getElementById('trl-confirm-msg').textContent = msg;
  overlay.style.display = 'flex';
  const yesBtn = overlay.querySelector('.trl-confirm-yes');
  const newYes = yesBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(newYes, yesBtn);
  newYes.addEventListener('click', () => {
    overlay.style.display = 'none';
    onYes && onYes();
  });
}

// 全局变量
let configSchema = null;
let currentConfig = null;
let flowersData = null;
let vasesData = null;
let flowerArtData = null;
let flowerElvesData = null;

// 加载花卉数据库（从 flowers.data.js）
function loadFlowersData() {
  console.log('[LoadFlowers] 开始加载花卉数据');
  console.log('[LoadFlowers] window.FLOWERS_DATA:', window.FLOWERS_DATA ? window.FLOWERS_DATA.length : 'undefined');
  
  // 直接使用 flowers.data.js 中定义的 window.FLOWERS_DATA
  flowersData = window.FLOWERS_DATA || [];
  console.log('[LoadFlowers] ✅ 花卉数据加载成功:', flowersData.length, '种花卉');
  console.log('[LoadFlowers] 前3种花卉:', flowersData.slice(0, 3));
}

// 加载花艺品数据库（从 flowerArt.data.js）
function loadFlowerArtData() {
  flowerArtData = window.FARTS_DATA || [];
  console.log('[LoadFlowerArt] ✅ 花艺品数据加载成功:', flowerArtData.length, '条');
}

// 加载花灵数据库（从 flowerElves.data.js）
function loadFlowerElvesData() {
  flowerElvesData = window.FLOWER_ELVES_DATA || [];
}

// 加载花瓶数据库（从 vases.data.js）
function loadVasesData() {
  console.log('[LoadVases] 开始加载花瓶数据');
  console.log('[LoadVases] window.VASES_DATA:', window.VASES_DATA ? window.VASES_DATA.length : 'undefined');
  
  // 直接使用 vases.data.js 中定义的 window.VASES_DATA
  vasesData = window.VASES_DATA || [];
  console.log('[LoadVases] ✅ 花瓶数据加载成功:', vasesData.length, '个花瓶');
  console.log('[LoadVases] 前3个花瓶:', vasesData.slice(0, 3));
}

// 显示添加特需规则对话框
function showDemandAddDialog(onConfirm, options) {
  const countLabel = (options && options.countLabel) || '需求数量';
  const countMax   = (options && options.countMax)   || 2000000000;
  const countDefault = (options && options.countDefault) || 100;
  // 创建弹出层
  const overlay = document.createElement('div');
  overlay.className = 'flower-select-dropdown';
  overlay.style.display = 'flex';
  
  let selectedFlowerId = null;
  
  overlay.innerHTML = `
    <div class="flower-select-dropdown-content" style="max-height: 80vh;">
      <div class="flower-select-header">添加特需规则</div>
      <div class="demand-dialog-body">
        <div class="demand-dialog-field">
          <label>选择花卉</label>
          <div class="demand-flower-select" id="demand-flower-select">
            <span class="demand-flower-placeholder">点击选择花卉...</span>
          </div>
        </div>
        <div class="demand-dialog-field">
          <label>${countLabel}</label>
          <input type="number" class="demand-count-input" min="1" max="${countMax}" value="${countDefault}" placeholder="请输入${countLabel}">
        </div>
      </div>
      <div class="demand-dialog-footer">
        <button type="button" class="demand-dialog-btn demand-cancel-btn">取消</button>
        <button type="button" class="demand-dialog-btn demand-confirm-btn">确定</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  
  const flowerSelect = overlay.querySelector('.demand-flower-select');
  const placeholder = overlay.querySelector('.demand-flower-placeholder');
  const countInput = overlay.querySelector('.demand-count-input');
  const cancelBtn = overlay.querySelector('.demand-cancel-btn');
  const confirmBtn = overlay.querySelector('.demand-confirm-btn');
  
  // 点击选择花卉
  flowerSelect.addEventListener('click', () => {
    showFlowerPicker((flowerId) => {
      selectedFlowerId = flowerId;
      const flower = flowersData.find(f => f.id === flowerId);
      if (flower) {
        const qualityName = ['', '凡', '普', '珍', '华', '仙'][flower.color] || '';
        placeholder.textContent = `${flower.name} ${qualityName ? `(${qualityName})` : ''}`;
        placeholder.style.color = '#323233';
      }
    });
  });
  
  // 取消
  cancelBtn.addEventListener('click', () => {
    overlay.remove();
    document.body.style.overflow = '';
  });
  
  // 确定
  confirmBtn.addEventListener('click', () => {
    if (!selectedFlowerId) {
      alert('请选择花卉');
      return;
    }
    const count = parseInt(countInput.value);
    if (!count || count <= 0) {
      alert('请输入有效的需求数量');
      return;
    }
    if (count > 2000000000) {
      alert('需求数量不能超过 2000000000');
      return;
    }
    onConfirm(selectedFlowerId, count);
    overlay.remove();
    document.body.style.overflow = '';
  });
  
  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      document.body.style.overflow = '';
    }
  });
}

// 显示花卉选择器（单选）
function showFlowerPicker(onSelect) {
  const overlay = document.createElement('div');
  overlay.className = 'flower-select-dropdown';
  overlay.style.display = 'flex';
  
  overlay.innerHTML = `
    <div class="flower-select-dropdown-content">
      <div class="flower-select-header">选择花卉</div>
      <div class="flower-select-search">
        <input type="text" placeholder="搜索花卉..." class="flower-search-input">
      </div>
      <div class="flower-select-options"></div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  const searchInput = overlay.querySelector('.flower-search-input');
  const optionsContainer = overlay.querySelector('.flower-select-options');
  
  // 渲染花卉选项（单选）
  const renderOptions = (keyword = '') => {
    const filtered = keyword 
      ? flowersData.filter(f => f.name.toLowerCase().includes(keyword.toLowerCase()))
      : flowersData;
    
    optionsContainer.innerHTML = filtered.map(flower => {
      const qualityName = ['', '凡', '普', '珍', '华', '仙'][flower.color] || '';
      return `
        <div class="flower-option" data-id="${flower.id}">
          <span>${flower.name} (${qualityName})</span>
        </div>
      `;
    }).join('');
    
    // 绑定点击事件
    optionsContainer.querySelectorAll('.flower-option').forEach(option => {
      option.addEventListener('click', () => {
        const flowerId = parseInt(option.getAttribute('data-id'));
        onSelect(flowerId);
        overlay.remove();
      });
    });
  };
  
  renderOptions();
  
  // 搜索
  searchInput.addEventListener('input', (e) => {
    renderOptions(e.target.value);
  });
  
  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

let originalConfig = null;
let hasUnsavedChanges = false;
let isInitializing = true;

// 监听父页面的返回按钮请求
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'parent-back-request') {
    console.log('[AutoConfig] Received back request from parent');
    
    // 直接告诉父页面可以关闭配置弹窗
    event.source.postMessage({
      type: 'back-handled',
      shouldClose: true
    }, '*');
  }
});

// 显示提示消息
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// 切换加载状态
function toggleLoading(show) {
  const loadingOverlay = document.getElementById('loadingOverlay');
  const configContent = document.getElementById('configContent');
  
  if (loadingOverlay) {
    if (show) {
      loadingOverlay.classList.remove('hidden');
    } else {
      loadingOverlay.classList.add('hidden');
    }
  }
  if (configContent) {
    configContent.style.display = show ? 'none' : 'block';
  }
}

// 深拷贝对象
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// 加载 schema 文件
async function loadSchema() {
  // 使用外部 JS 文件定义的 CONFIG_SCHEMA
  if (window.CONFIG_SCHEMA) {
    console.log('[AutoConfig] Using CONFIG_SCHEMA from config.schema.js');
    return window.CONFIG_SCHEMA;
  }
  
  // 如果没有加载到，报错
  console.error('[AutoConfig] CONFIG_SCHEMA not found! Please ensure config.schema.js is loaded.');
  throw new Error('CONFIG_SCHEMA not found');
}

// 根据 schema 生成默认配置
function generateDefaultConfig(schema) {
  const defaultConfig = {};
  const properties = schema.properties || {};
  
  Object.keys(properties).forEach(groupKey => {
    const groupSchema = properties[groupKey];
    defaultConfig[groupKey] = {};
    
    const groupProps = groupSchema.properties || {};
    Object.keys(groupProps).forEach(key => {
      const propSchema = groupProps[key];
      defaultConfig[groupKey][key] = propSchema.default !== undefined ? propSchema.default : getDefaultValue(propSchema.type);
    });
  });
  
  return defaultConfig;
}

// 根据类型获取默认值
function getDefaultValue(type) {
  switch (type) {
    case 'boolean': return false;
    case 'integer':
    case 'number': return 0;
    case 'string': return '';
    case 'array': return [];
    default: return null;
  }
}

// 根据 schema 生成表单
function generateForm(schema, configData) {
  const container = document.getElementById('configContent');
  container.innerHTML = '';
  
  const properties = schema.properties || {};
  
  Object.keys(properties).forEach(groupKey => {
    const groupSchema = properties[groupKey];
    const groupData = configData[groupKey] || {};
    const groupLabel = groupSchema.description || groupKey;
    
    // 创建分组
    const details = document.createElement('details');
    details.className = 'group';
    
    const summary = document.createElement('summary');
    summary.className = 'group-title';
    summary.textContent = groupLabel;
    details.appendChild(summary);
    
    // 创建内容包装器（用于动画）
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'panel-content';
    
    // 遍历分组内的配置项，按 subgroup 分组
    const groupProps = groupSchema.properties || {};
    const subgroups = {};
    const normalFields = [];
    
    // 先分类：有 subgroup 的和没有的
    Object.keys(groupProps).forEach(key => {
      const propSchema = groupProps[key];
      if (propSchema.subgroup) {
        if (!subgroups[propSchema.subgroup]) {
          subgroups[propSchema.subgroup] = [];
        }
        subgroups[propSchema.subgroup].push({ key, propSchema });
      } else {
        normalFields.push({ key, propSchema });
      }
    });
    
    // 分离普通字段和依赖字段
    const independentFields = [];
    const dependentFieldsMap = {};
    
    normalFields.forEach(({ key, propSchema }) => {
      if (propSchema.dependsOn) {
        if (!dependentFieldsMap[propSchema.dependsOn]) {
          dependentFieldsMap[propSchema.dependsOn] = [];
        }
        dependentFieldsMap[propSchema.dependsOn].push({ key, propSchema });
      } else {
        independentFields.push({ key, propSchema });
      }
    });
    
    // 渲染独立字段和它们的依赖字段
    // 把本组实际值存到全局，供 intRange start 字段取 pair 值
    window._intRangePairValues = window._intRangePairValues || {};
    Object.keys(groupProps).forEach(k => {
      const fid = `${groupKey}_${k}`;
      window._intRangePairValues[fid] = groupData[k] !== undefined ? groupData[k] : (groupProps[k].default || 0);
    });

    // 递归渲染依赖子字段，支持任意深度
    const renderDependents = (parentKey, parentFieldId, container) => {
      if (!dependentFieldsMap[parentKey]) return;
      const subgroupDiv = document.createElement('div');
      subgroupDiv.className = 'subgroup dependent-subgroup';
      subgroupDiv.setAttribute('data-depends-on', parentFieldId);
      dependentFieldsMap[parentKey].forEach(({ key: depKey, propSchema: depSchema }) => {
        const depValue = groupData[depKey] !== undefined ? groupData[depKey] : depSchema.default;
        const depLabel = depSchema.description || depKey;
        const depFieldId = `${groupKey}_${depKey}`;
        const depField = createFieldElement(depSchema, depFieldId, depLabel, depValue, groupProps);
        subgroupDiv.appendChild(depField);
        renderDependents(depKey, depFieldId, subgroupDiv);
      });
      container.appendChild(subgroupDiv);
    };

    independentFields.forEach(({ key, propSchema }) => {
      const value = groupData[key] !== undefined ? groupData[key] : propSchema.default;
      const label = propSchema.description || key;
      const fieldId = `${groupKey}_${key}`;
      
      const field = createFieldElement(propSchema, fieldId, label, value, groupProps);
      contentWrapper.appendChild(field);
      
      renderDependents(key, fieldId, contentWrapper);
    });
    
    // 渲染子分组
    Object.keys(subgroups).forEach(subgroupName => {
      const subgroupDiv = document.createElement('div');
      subgroupDiv.className = 'subgroup';
      subgroupDiv.innerHTML = `<div class="subgroup-title">${subgroupName}</div>`;
      
      // 分离子分组中的独立字段和依赖字段
      const subIndependentFields = [];
      const subDependentFieldsMap = {};
      
      subgroups[subgroupName].forEach(({ key, propSchema }) => {
        if (propSchema.dependsOn) {
          const deps = Array.isArray(propSchema.dependsOn) ? propSchema.dependsOn : [propSchema.dependsOn];
          const primaryDep = deps[0];
          if (!subDependentFieldsMap[primaryDep]) subDependentFieldsMap[primaryDep] = [];
          subDependentFieldsMap[primaryDep].push({ key, propSchema, allDeps: deps });
        } else {
          // orDependsOn字段作为独立字段渲染（放到末尾），显隐由JS控制
          subIndependentFields.push({ key, propSchema });
        }
      });
      
      // 渲染独立字段和它们的依赖字段
      subIndependentFields.forEach(({ key, propSchema }) => {
        const value = groupData[key] !== undefined ? groupData[key] : propSchema.default;
        const label = propSchema.description || key;
        const fieldId = `${groupKey}_${key}`;
        
        const field = createFieldElement(propSchema, fieldId, label, value, groupProps);
        // orDependsOn：标记data-or-depends属性，供显隐逻辑使用
        if (propSchema.orDependsOn) {
          const orDepIds = propSchema.orDependsOn.map(dep => `${groupKey}_${dep}`).join(',');
          field.setAttribute('data-or-depends', orDepIds);
        }
        subgroupDiv.appendChild(field);
        
        // 如果有依赖此字段的字段，创建嵌套的依赖子分组
        if (subDependentFieldsMap[key]) {
          const nestedSubgroupDiv = document.createElement('div');
          nestedSubgroupDiv.className = 'subgroup dependent-subgroup';
          // 收集所有相关fieldId（含OR依赖的其他字段）
          const allRelatedFieldIds = new Set([fieldId]);
          subDependentFieldsMap[key].forEach(({ allDeps }) => {
            if (allDeps) allDeps.forEach(dep => allRelatedFieldIds.add(`${groupKey}_${dep}`));
          });
          nestedSubgroupDiv.setAttribute('data-depends-on', [...allRelatedFieldIds].join(','));
          const isOrLogic = allRelatedFieldIds.size > 1;
          if (isOrLogic) nestedSubgroupDiv.setAttribute('data-depends-on-or', 'true');
          
          subDependentFieldsMap[key].forEach(({ key: depKey, propSchema: depSchema }) => {
            const depValue = groupData[depKey] !== undefined ? groupData[depKey] : depSchema.default;
            const depLabel = depSchema.description || depKey;
            const depFieldId = `${groupKey}_${depKey}`;
            
            const depField = createFieldElement(depSchema, depFieldId, depLabel, depValue, groupProps);
            nestedSubgroupDiv.appendChild(depField);
            
            // 检查此依赖字段是否还有自己的子依赖（三层嵌套）
            if (subDependentFieldsMap[depKey]) {
              const deepSubgroupDiv = document.createElement('div');
              deepSubgroupDiv.className = 'subgroup dependent-subgroup';
              deepSubgroupDiv.setAttribute('data-depends-on', depFieldId);
              
              subDependentFieldsMap[depKey].forEach(({ key: deepKey, propSchema: deepSchema }) => {
                const deepValue = groupData[deepKey] !== undefined ? groupData[deepKey] : deepSchema.default;
                const deepLabel = deepSchema.description || deepKey;
                const deepFieldId = `${groupKey}_${deepKey}`;
                
                const deepField = createFieldElement(deepSchema, deepFieldId, deepLabel, deepValue, groupProps);
                deepSubgroupDiv.appendChild(deepField);
                
                // 检查四层嵌套
                if (subDependentFieldsMap[deepKey]) {
                  const deepestSubgroupDiv = document.createElement('div');
                  deepestSubgroupDiv.className = 'subgroup dependent-subgroup';
                  deepestSubgroupDiv.setAttribute('data-depends-on', deepFieldId);
                  
                  subDependentFieldsMap[deepKey].forEach(({ key: deepestKey, propSchema: deepestSchema }) => {
                    const deepestValue = groupData[deepestKey] !== undefined ? groupData[deepestKey] : deepestSchema.default;
                    const deepestLabel = deepestSchema.description || deepestKey;
                    const deepestFieldId = `${groupKey}_${deepestKey}`;
                    
                    const deepestField = createFieldElement(deepestSchema, deepestFieldId, deepestLabel, deepestValue, groupProps);
                    deepestSubgroupDiv.appendChild(deepestField);
                  });
                  
                  deepSubgroupDiv.appendChild(deepestSubgroupDiv);
                }
              });
              
              nestedSubgroupDiv.appendChild(deepSubgroupDiv);
            }
          });
          
          subgroupDiv.appendChild(nestedSubgroupDiv);
        }
      });
      
      contentWrapper.appendChild(subgroupDiv);
    });
    
    details.appendChild(contentWrapper);
    container.appendChild(details);
  });
  
  // 处理依赖子分组的初始显示状态
  setTimeout(() => {
    // orDependsOn字段初始显隐
    document.querySelectorAll('.field[data-or-depends]').forEach(field => {
      const depIds = field.getAttribute('data-or-depends').split(',').map(s => s.trim());
      const anyChecked = depIds.some(fid => {
        const el = document.getElementById(fid);
        return el && el.type === 'checkbox' && el.checked;
      });
      field.style.display = anyChecked ? '' : 'none';
    });
    document.querySelectorAll('.dependent-subgroup[data-depends-on]').forEach(subgroup => {
      const isOr = subgroup.getAttribute('data-depends-on-or') === 'true';
      const dependFieldIds = subgroup.getAttribute('data-depends-on').split(',');
      if (isOr) {
        const anyChecked = dependFieldIds.some(fid => {
          const el = document.getElementById(fid.trim());
          return el && el.type === 'checkbox' && el.checked;
        });
        subgroup.style.display = anyChecked ? '' : 'none';
      } else {
        const dependElement = document.getElementById(dependFieldIds[0].trim());
        if (dependElement && dependElement.type === 'checkbox') {
          subgroup.style.display = dependElement.checked ? '' : 'none';
        }
      }
    });
  }, 100);
  
  // 添加帮助图标点击事件
  document.querySelectorAll('.help-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // 移除其他已存在的提示气泡
      document.querySelectorAll('.help-tooltip').forEach(t => t.remove());
      
      const helpText = icon.getAttribute('data-help');
      
      // 创建提示气泡
      const tooltip = document.createElement('div');
      tooltip.className = 'help-tooltip';
      tooltip.textContent = helpText;
      document.body.appendChild(tooltip);
      
      // 定位气泡（防止溢出屏幕）
      const rect = icon.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      // 计算水平位置（居中对齐图标）
      let left = rect.left + rect.width / 2;
      
      // 检查左侧边界
      const minLeft = tooltipRect.width / 2 + 10;
      if (left < minLeft) {
        left = minLeft;
      }
      
      // 检查右侧边界
      const maxLeft = window.innerWidth - tooltipRect.width / 2 - 10;
      if (left > maxLeft) {
        left = maxLeft;
      }
      
      tooltip.style.left = left + 'px';
      tooltip.style.top = rect.top - 10 + 'px';
      
      // 点击其他地方关闭（只在这个气泡存在时监听）
      const closeOnClick = (event) => {
        if (!event.target.classList.contains('help-icon') && !tooltip.contains(event.target)) {
          tooltip.remove();
          document.removeEventListener('click', closeOnClick);
        }
      };
      setTimeout(() => {
        document.addEventListener('click', closeOnClick, { once: false });
      }, 0);
    });
  });
  
  // 滚动时关闭提示气泡（优化：只在有气泡时才执行）
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    const tooltips = document.querySelectorAll('.help-tooltip');
    if (tooltips.length > 0) {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        tooltips.forEach(t => t.remove());
      }, 50);
    }
  }, { passive: true });
  
  // 窗口失去焦点时关闭提示气泡
  window.addEventListener('blur', () => {
    const tooltips = document.querySelectorAll('.help-tooltip');
    if (tooltips.length > 0) {
      tooltips.forEach(t => t.remove());
    }
  });
  
  // 添加依赖字段的变化监听
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const fieldId = e.target.id;
      const isChecked = e.target.checked;
      
      // 处理orDependsOn字段
      document.querySelectorAll('.field[data-or-depends]').forEach(field => {
        const depIds = field.getAttribute('data-or-depends').split(',').map(s => s.trim());
        if (!depIds.includes(fieldId)) return;
        const anyChecked = depIds.some(fid => {
          const el = document.getElementById(fid);
          return el && el.type === 'checkbox' && el.checked;
        });
        field.style.display = anyChecked ? '' : 'none';
      });
      // 查找依赖此字段的子分组
      // 查找data-depends-on包含此fieldId的所有子分组（支持逗号分隔多值）
      document.querySelectorAll('.dependent-subgroup[data-depends-on]').forEach(subgroup => {
        const depIds = subgroup.getAttribute('data-depends-on').split(',').map(s => s.trim());
        if (!depIds.includes(fieldId)) return;
        const isOr = subgroup.getAttribute('data-depends-on-or') === 'true';
        if (isOr) {
          const anyChecked = depIds.some(fid => {
            const el = document.getElementById(fid);
            return el && el.type === 'checkbox' && el.checked;
          });
          subgroup.style.display = anyChecked ? '' : 'none';
        } else {
          subgroup.style.display = isChecked ? '' : 'none';
        }
      });
    });
  });
}

// 创建字段元素的辅助函数
function createFieldElement(propSchema, fieldId, label, value, groupProps = {}) {
  const field = document.createElement('div');
  field.className = 'field';
  if (propSchema.warn) label = `${label}<span style="color:#e53935;margin-left:3px;font-size:12px" title="\u6d88\u8017\u5143\u5b9d">\u26a0</span>`;
  
  // 根据 schema 类型生成不同的输入控件
  if (propSchema.type === 'boolean') {
    // 布尔值 -> 开关
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    
    // 检查是否有依赖此字段的其他字段
    const fieldKey = fieldId.split('_').pop();
    const hasDependents = Object.values(groupProps).some(
      prop => prop.dependsOn === fieldKey ||
        (Array.isArray(prop.dependsOn) && prop.dependsOn.includes(fieldKey))
    );
    const switchClass = hasDependents ? 'switch has-dependents' : 'switch';
    
    field.innerHTML = `
      <div class="switch-container">
        <label>${label}${helpIcon}</label>
        <label class="${switchClass}">
          <input type="checkbox" id="${fieldId}" ${(value === null || value) ? 'checked' : ''}>
          <span class="switch-slider"></span>
        </label>
      </div>
    `;
  } else if (propSchema.type === 'intRange') {
    // 区间：两个整数输入框合为一行，end角色字段由start负责渲染，自身返回空
    if (propSchema.pairRole === 'end') {
      field.style.display = 'none';
      field.setAttribute('data-int-range-end', 'true');
    } else {
      // start角色：渲染一行两个输入框
      const pairKey = propSchema.pairWith;
      const pairFieldId = fieldId.replace(/[^_]+$/, pairKey);
      const pairSchema = groupProps[pairKey] || {};
      const pairValue = (typeof groupProps[pairKey] !== 'undefined' && typeof arguments[2] !== 'undefined')
        ? (window._intRangePairValues && window._intRangePairValues[pairFieldId] !== undefined
            ? window._intRangePairValues[pairFieldId] : (pairSchema.default || 0))
        : (pairSchema.default || 0);
      const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
      field.innerHTML = `
        <label>${label}${helpIcon}</label>
        <div class="int-range-inputs">
          <input type="text" inputmode="numeric" id="${fieldId}" value="${value}" placeholder="起始" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
          <span class="int-range-sep">~</span>
          <input type="text" inputmode="numeric" id="${pairFieldId}" value="${pairValue}" placeholder="结束" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        </div>
      `;
    }
  } else if (propSchema.type === 'integer' || propSchema.type === 'number') {
    // 数字 -> 数字输入框
    const min = propSchema.minimum !== undefined ? propSchema.minimum : (propSchema.min !== undefined ? propSchema.min : 0);
    const maxVal = propSchema.maximum !== undefined ? propSchema.maximum : (propSchema.max !== undefined ? propSchema.max : undefined);
    const maxAttr = maxVal !== undefined ? `max="${maxVal}"` : '';
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    field.innerHTML = `
      <label>${label}${helpIcon}</label>
      <input type="text" inputmode="numeric" id="${fieldId}" value="${value}" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
    `;
    const numInput = field.querySelector('input');
    numInput.addEventListener('blur', () => {
      let v = parseInt(numInput.value);
      if (isNaN(v)) v = min;
      if (v < min) v = min;
      if (maxVal !== undefined && v > maxVal) v = maxVal;
      numInput.value = v;
    });
  } else if (propSchema.type === 'select') {
    // 下拉选择框（支持 options 数组）
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    const options = propSchema.options.map(opt => {
      const optValue = typeof opt === 'object' ? opt.value : opt;
      const optLabel = typeof opt === 'object' ? opt.label : opt;
      return `<option value="${optValue}" ${String(value) === String(optValue) ? 'selected' : ''}>${optLabel}</option>`;
    }).join('');
    field.innerHTML = `
      <label>${label}${helpIcon}</label>
      <select id="${fieldId}" class="control-select">${options}</select>
    `;
  } else if (propSchema.type === 'string') {
    // 字符串 -> 下拉框或文本框
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    if (propSchema.enum) {
      const options = propSchema.enum.map(opt => 
        `<option value="${opt}" ${value === opt ? 'selected' : ''}>${getEnumLabel(opt)}</option>`
      ).join('');
      field.innerHTML = `
        <label>${label}${helpIcon}</label>
        <select id="${fieldId}">${options}</select>
      `;
    } else {
      const patternAttr = propSchema.pattern ? `pattern="${propSchema.pattern}"` : '';
      const maxLen = propSchema.maxLength ? `maxlength="${propSchema.maxLength}"` : '';
      field.innerHTML = `
        <label>${label}${helpIcon}</label>
        <input type="text" id="${fieldId}" value="${value}" ${patternAttr} ${maxLen}>
      `;
      if (propSchema.pattern) {
        setTimeout(() => {
          const el = document.getElementById(fieldId);
          if (!el) return;
          el.addEventListener('input', () => {
            const pattern = new RegExp(propSchema.pattern);
            // 逐字符过滤：只保留符合模式约束的字符（数字/字母等）
            const digitOnly = /^\d+$/.test(propSchema.pattern.replace(/[^a-zA-Z0-9]/g, ''));
            if (digitOnly) {
              el.value = el.value.replace(/\D/g, '');
            }
            if (propSchema.maxLength) {
              el.value = el.value.slice(0, propSchema.maxLength);
            }
          });
        }, 0);
      }
    }
  } else if (propSchema.type === 'locked') {
    // 锁定功能：占位展示，点击提示（暂不对外开放）
    const lockedMsg = propSchema.lockedMessage || '此功能暂不对外开放，如需使用请联系上级';
    field.innerHTML = `
      <div class="locked-feature" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f7f8fa;border:1px dashed #e0e0e0;border-radius:8px;cursor:pointer;user-select:none;">
        <span style="font-size:14px;color:#333;">${label}</span>
        <span style="font-size:12px;color:#999;border:1px solid #d9d9d9;border-radius:3px;padding:1px 5px;">暂不开放</span>
      </div>
    `;
    field.querySelector('.locked-feature').addEventListener('click', () => showToast(lockedMsg));
  } else if (propSchema.type === 'display') {
    // 只读展示项（统计/固定值），不交互、不参与保存
    const displayValue = propSchema.value !== undefined ? propSchema.value : '';
    field.innerHTML = `
      <div class="stat-display" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f7f8fa;border-radius:8px;">
        <span style="font-size:14px;color:#333;">${label}</span>
        <span style="font-size:14px;color:#969799;">${displayValue}</span>
      </div>
    `;
  } else if (propSchema.type === 'memberList') {
    // 成员列表：输入玩家名回车添加，tag形式展示
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    const initMembers = Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : [];
    field.innerHTML = `<label>${label}${helpIcon}</label><div class="frl-member-list" id="${fieldId}"></div>`;
    setTimeout(() => {
      const container = document.getElementById(fieldId);
      if (!container) return;
      const members = initMembers.slice();
      const save = () => container.setAttribute('data-member-list', JSON.stringify(members));
      const renderList = () => {
        container.innerHTML = '';
        const inputRow = document.createElement('div');
        inputRow.className = 'frl-member-input';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = '输入玩家名，回车添加';
        const hint = document.createElement('div');
        hint.className = 'frl-member-hint';
        hint.textContent = '格式：大区.名称，如 s138.大宗师';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '+ 添加';
        const add = () => { const n = inp.value.trim(); if (!n || members.includes(n)) return; members.push(n); save(); renderList(); inp.value = ''; };
        btn.addEventListener('click', add);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
        inputRow.appendChild(inp);
        inputRow.appendChild(hint);
        inputRow.appendChild(btn);
        container.appendChild(inputRow);
        const tags = document.createElement('div');
        tags.className = 'frl-member-tags';
        members.forEach((name, i) => {
          const tag = document.createElement('span');
          tag.className = 'frl-member-tag';
          tag.innerHTML = `${name} <span class="frl-member-remove">×</span>`;
          tag.querySelector('.frl-member-remove').addEventListener('click', () => { members.splice(i, 1); save(); renderList(); });
          tags.appendChild(tag);
        });
        container.appendChild(tags);
      };
      save();
      renderList();
    }, 0);
  } else if (propSchema.type === 'range') {
    // 区间选择器（双滑块）
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    const min = propSchema.min || 0;
    const max = propSchema.max || 100;
    const defaultValue = Array.isArray(value) ? value : [min, max];
    const minValue = defaultValue[0];
    const maxValue = defaultValue[1];
    
    field.innerHTML = `
      <label>${label}${helpIcon}</label>
      <div class="range-slider" id="${fieldId}">
        <div class="range-values">
          <span class="range-min-value">${minValue}</span>
          <span class="range-separator">-</span>
          <span class="range-max-value">${maxValue}</span>
        </div>
        <div class="range-track">
          <div class="range-fill"></div>
          <input type="range" class="range-min" min="${min}" max="${maxValue - 1}" value="${minValue}" step="1">
          <input type="range" class="range-max" min="${minValue + 1}" max="${max}" value="${maxValue}" step="1">
        </div>
      </div>
    `;
    
    // 添加滑块事件监听
    setTimeout(() => {
      const rangeSlider = document.getElementById(fieldId);
      if (!rangeSlider) return;
      
      const minSlider = rangeSlider.querySelector('.range-min');
      const maxSlider = rangeSlider.querySelector('.range-max');
      const minValueSpan = rangeSlider.querySelector('.range-min-value');
      const maxValueSpan = rangeSlider.querySelector('.range-max-value');
      const fill = rangeSlider.querySelector('.range-fill');
      
      const updateRange = () => {
        let minVal = parseInt(minSlider.value);
        let maxVal = parseInt(maxSlider.value);
        
        // 限制左滑块不能超过右滑块-1
        if (minVal >= maxVal) {
          minVal = maxVal - 1;
          if (minVal < min) minVal = min;
          minSlider.value = minVal;
        }
        
        // 限制右滑块不能小于左滑块+1
        if (maxVal <= minVal) {
          maxVal = minVal + 1;
          if (maxVal > max) maxVal = max;
          maxSlider.value = maxVal;
        }
        
        // 更新显示的数值
        minValueSpan.textContent = minVal;
        maxValueSpan.textContent = maxVal;
        
        // 计算填充条的位置和宽度（使用原始的 min 和 max）
        const percent1 = ((minVal - min) / (max - min)) * 100;
        const percent2 = ((maxVal - min) / (max - min)) * 100;
        
        // 直接更新样式
        fill.style.left = percent1 + '%';
        fill.style.width = (percent2 - percent1) + '%';
      };
      
      minSlider.addEventListener('input', updateRange);
      maxSlider.addEventListener('input', updateRange);
      updateRange();
    }, 0);
  } else if (propSchema.type === 'timeRangeList') {
    // 离线时间段列表编辑器，每段格式 {start:'HH:MM', end:'HH:MM'}，每段至少20分钟，不跨天
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    const timeList = Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : [];
    field.innerHTML = `
      <label>${label}${helpIcon}</label>
      <div class="time-range-list-editor" id="${fieldId}">
        <div class="trl-add-row">
          <div class="trl-time-display trl-start-display">15:00</div>
          <span class="time-range-sep">至</span>
          <div class="trl-time-display trl-end-display">17:00</div>
          <button type="button" class="trl-add-btn">+ 添加</button>
        </div>
        <div class="trl-error" style="display:none;color:#e53935;font-size:12px;margin-top:4px;"></div>
        <div class="trl-list"></div>
      </div>
    `;
    setTimeout(() => {
      const editor = document.getElementById(fieldId);
      if (!editor) return;
      const addBtn = editor.querySelector('.trl-add-btn');
      const errorDiv = editor.querySelector('.trl-error');
      const listDiv = editor.querySelector('.trl-list');
      const startDisplay = editor.querySelector('.trl-start-display');
      const endDisplay = editor.querySelector('.trl-end-display');
      const toMinutes = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
      const pad2 = n => String(n).padStart(2, '0');

      // ---- 滚轮弹窗 ----

      const ensurePicker = () => {
        if (document.getElementById('trl-picker-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'trl-picker-overlay';
        overlay.className = 'trl-picker-overlay';
        overlay.innerHTML = `
          <div class="trl-picker-panel" id="trl-picker-panel">
            <div class="trl-picker-title">选择时间</div>
            <div class="trl-picker-body">
              <div class="trl-picker-col" id="trl-picker-h-col">
                <div class="trl-picker-scroll" id="trl-picker-h"></div>
              </div>
              <div class="trl-picker-sep">:</div>
              <div class="trl-picker-col" id="trl-picker-m-col">
                <div class="trl-picker-scroll" id="trl-picker-m"></div>
              </div>
            </div>
            <div class="trl-picker-footer">
              <button type="button" class="trl-picker-cancel">取消</button>
              <button type="button" class="trl-picker-confirm">确认</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);

        const hScroll = overlay.querySelector('#trl-picker-h');
        const mScroll = overlay.querySelector('#trl-picker-m');

        const scrollToSelected = (scrollEl) => {
          const sel = scrollEl.querySelector('.selected');
          if (sel) {
            const itemH = sel.offsetHeight || 44;
            scrollEl.scrollTop = sel.offsetTop - scrollEl.offsetHeight / 2 + itemH / 2;
          }
        };

        const fillCol = (el, count, selected) => {
          el.innerHTML = '';
          for (let i = 0; i < count; i++) {
            const item = document.createElement('div');
            item.className = 'trl-picker-item' + (i === selected ? ' selected' : '');
            item.textContent = pad2(i);
            item.dataset.val = i;
            item.addEventListener('click', () => {
              el.querySelectorAll('.trl-picker-item').forEach(x => x.classList.remove('selected'));
              item.classList.add('selected');
            });
            el.appendChild(item);
          }
        };

        const getSelected = (scrollEl) => {
          const sel = scrollEl.querySelector('.trl-picker-item.selected');
          return sel ? parseInt(sel.dataset.val) : 0;
        };

        overlay.querySelector('.trl-picker-cancel').addEventListener('click', () => {
          overlay.style.display = 'none';
        });
        overlay.querySelector('.trl-picker-confirm').addEventListener('click', () => {
          const h = getSelected(hScroll);
          const m = getSelected(mScroll);
          const timeStr = pad2(h) + ':' + pad2(m);
          if (overlay._targetEl) overlay._targetEl.textContent = timeStr;
          overlay.style.display = 'none';
        });
        overlay.addEventListener('click', (ev) => {
          if (ev.target === overlay) overlay.style.display = 'none';
        });

        overlay._open = (targetEl, h, m) => {
          overlay._targetEl = targetEl;
          fillCol(hScroll, 24, h);
          fillCol(mScroll, 60, m);
          overlay.style.display = 'flex';
          setTimeout(() => { scrollToSelected(hScroll); scrollToSelected(mScroll); }, 30);
        };
      };

      const openPicker = (el) => {
        ensurePicker();
        const [h, m] = el.textContent.trim().split(':').map(Number);
        document.getElementById('trl-picker-overlay')._open(el, h, m);
      };

      startDisplay.addEventListener('click', () => openPicker(startDisplay));
      endDisplay.addEventListener('click', () => openPicker(endDisplay));

      const renderList = () => {
        editor.setAttribute('data-time-range-list', JSON.stringify(timeList));
        if (typeof checkIfChanged === 'function') checkIfChanged();
        if (timeList.length === 0) {
          listDiv.innerHTML = '<div class="trl-empty">暂无时间段，点击添加</div>';
        } else {
          listDiv.innerHTML = timeList.map((item, idx) => `
            <div class="trl-item">
              <span class="trl-item-time">${item.start} 至 ${item.end}</span>
              <button type="button" class="trl-del-btn" data-index="${idx}">删除</button>
            </div>
          `).join('');
          listDiv.querySelectorAll('.trl-del-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              timeList.splice(parseInt(btn.getAttribute('data-index')), 1);
              renderList();
            });
          });
        }
      };

      renderList();

      addBtn.addEventListener('click', () => {
        const s = startDisplay.textContent.trim();
        const e = endDisplay.textContent.trim();
        errorDiv.style.display = 'none';
        if (e <= s) { errorDiv.textContent = '结束时间须晚于开始时间（不跨天）'; errorDiv.style.display = 'block'; return; }
        if (toMinutes(e) - toMinutes(s) < 20) { errorDiv.textContent = '每段离线时间至少需要20分钟'; errorDiv.style.display = 'block'; return; }
        if (timeList.some(item => item.start === s && item.end === e)) { errorDiv.textContent = '该时间段已存在'; errorDiv.style.display = 'block'; return; }

        const sMin = toMinutes(s), eMin = toMinutes(e);
        const overlaps = timeList.filter(item => toMinutes(item.end) > sMin && toMinutes(item.start) < eMin);
        if (overlaps.length > 0) {
          const overlapDesc = overlaps.map(i => `${i.start}~${i.end}`).join('、');
          showConfirm(`与已有时间段 ${overlapDesc} 存在重叠，是否合并为一个时间段？`, () => {
            const allMins = [sMin, ...overlaps.map(i => toMinutes(i.start))];
            const allMaxs = [eMin, ...overlaps.map(i => toMinutes(i.end))];
            const mergedStart = Math.min(...allMins);
            const mergedEnd = Math.max(...allMaxs);
            const padT = n => pad2(Math.floor(n / 60)) + ':' + pad2(n % 60);
            overlaps.forEach(ov => { const idx = timeList.indexOf(ov); if (idx >= 0) timeList.splice(idx, 1); });
            timeList.push({ start: padT(mergedStart), end: padT(mergedEnd) });
            renderList();
          });
          return;
        }

        timeList.push({ start: s, end: e });
        renderList();
      });
    }, 0);
  } else if (propSchema.type === 'multiselect') {
    // 多选框
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    const selectedIndices = Array.isArray(value) ? value : [];
    const checkboxes = propSchema.options.map((opt, idx) => {
      const checked = selectedIndices.includes(idx + 1) ? 'checked' : '';
      return `
        <label class="checkbox-label">
          <input type="checkbox" name="${fieldId}" value="${idx + 1}" data-index="${idx + 1}" ${checked}>
          <span>${opt}</span>
        </label>
      `;
    }).join('');
    field.innerHTML = `
      <label>${label}${helpIcon}</label>
      <div class="checkbox-group" id="${fieldId}">${checkboxes}</div>
    `;
  } else if (propSchema.type === 'flowerMultiselect') {
    // 花卉多选下拉框（带复选框）
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    const selectedIds = Array.isArray(value) ? value : [];
    
    field.innerHTML = `
      <label>${label}${helpIcon}</label>
      <div class="flower-select-wrapper" id="${fieldId}">
        <div class="flower-select-display">
          <span class="flower-select-placeholder">加载中...</span>
          <span class="flower-select-arrow">▼</span>
        </div>
        <div class="flower-select-dropdown" style="display: none;">
          <div class="flower-select-dropdown-content">
            <div class="flower-select-header">选择花卉</div>
            <div class="flower-select-search">
              <input type="text" placeholder="搜索花卉..." class="flower-search-input">
            </div>
            <div class="flower-select-options">
              <label class="flower-option">
                <input type="checkbox" value="loading" disabled>
                <span>加载中...</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // 异步加载花卉选项
    setTimeout(() => {
      const wrapper = document.getElementById(fieldId);
      const display = wrapper.querySelector('.flower-select-display');
      const placeholder = wrapper.querySelector('.flower-select-placeholder');
      const dropdown = wrapper.querySelector('.flower-select-dropdown');
      const optionsContainer = wrapper.querySelector('.flower-select-options');
      const searchInput = wrapper.querySelector('.flower-search-input');
      
      console.log('[FlowerSelect] 初始化花卉选择器');
      console.log('[FlowerSelect] fieldId:', fieldId);
      console.log('[FlowerSelect] wrapper:', wrapper);
      console.log('[FlowerSelect] flowersData:', flowersData);
      console.log('[FlowerSelect] window.FLOWERS_DATA:', window.FLOWERS_DATA);
      
      // 如果 flowersData 为空，尝试从 window.FLOWERS_DATA 重新加载
      if (!flowersData && window.FLOWERS_DATA) {
        console.log('[FlowerSelect] flowersData 为空，从 window.FLOWERS_DATA 重新加载');
        flowersData = window.FLOWERS_DATA;
      }
      
      if (flowersData && flowersData.length > 0) {
        console.log('[FlowerSelect] ✅ 开始渲染', flowersData.length, '种花卉');
        // 渲染选项
        optionsContainer.innerHTML = flowersData.map(flower => {
          const checked = selectedIds.includes(flower.id) ? 'checked' : '';
          const qualityName = ['', '凡', '普', '珍', '华', '仙'][flower.color] || '';
          return `
            <label class="flower-option">
              <input type="checkbox" value="${flower.id}" ${checked}>
              <span>${flower.name} (${qualityName})</span>
            </label>
          `;
        }).join('');
        
        // 更新显示（显示标签）
        const updateDisplay = () => {
          const checkedBoxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
          
          // 清空显示框
          display.innerHTML = '';
          
          if (checkedBoxes.length === 0) {
            // 没有选中，显示占位符
            const placeholderSpan = document.createElement('span');
            placeholderSpan.className = 'flower-select-placeholder';
            placeholderSpan.textContent = '请选择花卉';
            display.appendChild(placeholderSpan);
          } else {
            // 显示标签
            checkedBoxes.forEach(cb => {
              const flowerId = cb.value;
              const flowerName = cb.parentElement.querySelector('span').textContent;
              
              const tag = document.createElement('div');
              tag.className = 'flower-tag';
              tag.innerHTML = `
                <span class="flower-tag-text">${flowerName}</span>
                <span class="flower-tag-close" data-id="${flowerId}">×</span>
              `;
              
              // 点击删除按钮
              tag.querySelector('.flower-tag-close').addEventListener('click', (e) => {
                e.stopPropagation();
                cb.checked = false;
                updateDisplay();
              });
              
              display.appendChild(tag);
            });
          }
          
          // 添加箭头
          const arrow = document.createElement('span');
          arrow.className = 'flower-select-arrow';
          arrow.textContent = '▼';
          display.appendChild(arrow);
        };
        
        updateDisplay();
        
        // 点击显示框打开弹出层
        display.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = 'flex';
          // 防止页面滚动
          document.body.style.overflow = 'hidden';
        });
        
        // 点击遮罩层关闭弹出层
        dropdown.addEventListener('click', (e) => {
          // 只有点击遮罩层本身才关闭，点击内容区域不关闭
          if (e.target === dropdown) {
            dropdown.style.display = 'none';
            document.body.style.overflow = '';
          }
        });
        
        // 复选框变化时更新显示
        optionsContainer.addEventListener('change', updateDisplay);
        
        // 搜索功能
        searchInput.addEventListener('input', (e) => {
          const keyword = e.target.value.toLowerCase();
          const options = optionsContainer.querySelectorAll('.flower-option');
          options.forEach(option => {
            const text = option.querySelector('span').textContent.toLowerCase();
            option.style.display = text.includes(keyword) ? 'flex' : 'none';
          });
        });
      } else {
        console.log('[FlowerSelect] ❌ 没有花卉数据');
        console.log('[FlowerSelect] flowersData:', flowersData);
        console.log('[FlowerSelect] window.FLOWERS_DATA:', window.FLOWERS_DATA);
        optionsContainer.innerHTML = '<div class="flower-option-empty">暂无花卉数据</div>';
        placeholder.textContent = '暂无数据';
      }
    }, 0);
  } else if (propSchema.type === 'flowerArtMultiselect') {
    // 花艺品多选下拉框（带复选框）
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    const selectedIds = Array.isArray(value) ? value : [];
    
    field.innerHTML = `
      <label>${label}${helpIcon}</label>
      <div class="flower-select-wrapper" id="${fieldId}">
        <div class="flower-select-display">
          <span class="flower-select-placeholder">加载中...</span>
          <span class="flower-select-arrow">▼</span>
        </div>
        <div class="flower-select-dropdown" style="display: none;">
          <div class="flower-select-dropdown-content">
            <div class="flower-select-header">选择花艺品</div>
            <div class="flower-select-search">
              <input type="text" placeholder="搜索花艺品..." class="flower-search-input">
            </div>
            <div class="flower-select-options">
              <label class="flower-option">
                <input type="checkbox" value="loading" disabled>
                <span>加载中...</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
    
    setTimeout(() => {
      const wrapper = document.getElementById(fieldId);
      const display = wrapper.querySelector('.flower-select-display');
      const dropdown = wrapper.querySelector('.flower-select-dropdown');
      const optionsContainer = wrapper.querySelector('.flower-select-options');
      const searchInput = wrapper.querySelector('.flower-search-input');
      
      if (!flowerArtData && window.FARTS_DATA) flowerArtData = window.FARTS_DATA;
      
      if (flowerArtData && flowerArtData.length > 0) {
        optionsContainer.innerHTML = flowerArtData.map(item => {
          const checked = selectedIds.includes(item.id) ? 'checked' : '';
          return `
            <label class="flower-option">
              <input type="checkbox" value="${item.id}" ${checked}>
              <span>${item.name}</span>
            </label>
          `;
        }).join('');
        
        const updateDisplay = () => {
          const checkedBoxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
          display.innerHTML = '';
          if (checkedBoxes.length === 0) {
            const placeholderSpan = document.createElement('span');
            placeholderSpan.className = 'flower-select-placeholder';
            placeholderSpan.textContent = '请选择花艺品';
            display.appendChild(placeholderSpan);
          } else {
            checkedBoxes.forEach(cb => {
              const tag = document.createElement('div');
              tag.className = 'flower-tag';
              tag.innerHTML = `
                <span class="flower-tag-text">${cb.parentElement.querySelector('span').textContent}</span>
                <span class="flower-tag-close" data-id="${cb.value}">×</span>
              `;
              tag.querySelector('.flower-tag-close').addEventListener('click', (e) => {
                e.stopPropagation();
                cb.checked = false;
                updateDisplay();
              });
              display.appendChild(tag);
            });
          }
          const arrow = document.createElement('span');
          arrow.className = 'flower-select-arrow';
          arrow.textContent = '▼';
          display.appendChild(arrow);
        };
        
        updateDisplay();
        
        display.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = 'flex';
          document.body.style.overflow = 'hidden';
        });
        dropdown.addEventListener('click', (e) => {
          if (e.target === dropdown) {
            dropdown.style.display = 'none';
            document.body.style.overflow = '';
          }
        });
        optionsContainer.addEventListener('change', updateDisplay);
        searchInput.addEventListener('input', (e) => {
          const keyword = e.target.value.toLowerCase();
          optionsContainer.querySelectorAll('.flower-option').forEach(option => {
            option.style.display = option.querySelector('span').textContent.toLowerCase().includes(keyword) ? 'flex' : 'none';
          });
        });
      } else {
        optionsContainer.innerHTML = '<div class="flower-option-empty">暂无花艺品数据</div>';
      }
    }, 0);
  } else if (propSchema.type === 'elvesMultiselect') {
    // 花灵多选下拉框（带复选框）
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    const selectedIds = Array.isArray(value) ? value : [];
    
    field.innerHTML = `
      <label>${label}${helpIcon}</label>
      <div class="flower-select-wrapper" id="${fieldId}">
        <div class="flower-select-display">
          <span class="flower-select-placeholder">加载中...</span>
          <span class="flower-select-arrow">▼</span>
        </div>
        <div class="flower-select-dropdown" style="display: none;">
          <div class="flower-select-dropdown-content">
            <div class="flower-select-header">选择花灵</div>
            <div class="flower-select-search">
              <input type="text" placeholder="搜索花灵..." class="flower-search-input">
            </div>
            <div class="flower-select-options">
              <label class="flower-option">
                <input type="checkbox" value="loading" disabled>
                <span>加载中...</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
    
    setTimeout(() => {
      const wrapper = document.getElementById(fieldId);
      const display = wrapper.querySelector('.flower-select-display');
      const dropdown = wrapper.querySelector('.flower-select-dropdown');
      const optionsContainer = wrapper.querySelector('.flower-select-options');
      const searchInput = wrapper.querySelector('.flower-search-input');
      
      if (!flowerElvesData && window.FLOWER_ELVES_DATA) flowerElvesData = window.FLOWER_ELVES_DATA;
      
      if (flowerElvesData && flowerElvesData.length > 0) {
        const qualityName = (c) => ['', '凡', '普', '珍', '华', '仙'][c] || '';
        optionsContainer.innerHTML = flowerElvesData.map(item => {
          const checked = selectedIds.includes(item.id) ? 'checked' : '';
          return `
            <label class="flower-option">
              <input type="checkbox" value="${item.id}" ${checked}>
              <span>${item.name} (${qualityName(item.color)})</span>
            </label>
          `;
        }).join('');
        
        const updateDisplay = () => {
          const checkedBoxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
          display.innerHTML = '';
          if (checkedBoxes.length === 0) {
            const placeholderSpan = document.createElement('span');
            placeholderSpan.className = 'flower-select-placeholder';
            placeholderSpan.textContent = '请选择';
            display.appendChild(placeholderSpan);
          } else {
            checkedBoxes.forEach(cb => {
              const tag = document.createElement('div');
              tag.className = 'flower-tag';
              tag.innerHTML = `
                <span class="flower-tag-text">${cb.parentElement.querySelector('span').textContent}</span>
                <span class="flower-tag-close" data-id="${cb.value}">×</span>
              `;
              tag.querySelector('.flower-tag-close').addEventListener('click', (e) => {
                e.stopPropagation();
                cb.checked = false;
                updateDisplay();
              });
              display.appendChild(tag);
            });
          }
          const arrow = document.createElement('span');
          arrow.className = 'flower-select-arrow';
          arrow.textContent = '▼';
          display.appendChild(arrow);
        };
        
        updateDisplay();
        
        display.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = 'flex';
          document.body.style.overflow = 'hidden';
        });
        dropdown.addEventListener('click', (e) => {
          if (e.target === dropdown) {
            dropdown.style.display = 'none';
            document.body.style.overflow = '';
          }
        });
        optionsContainer.addEventListener('change', updateDisplay);
        searchInput.addEventListener('input', (e) => {
          const keyword = e.target.value.toLowerCase();
          optionsContainer.querySelectorAll('.flower-option').forEach(option => {
            option.style.display = option.querySelector('span').textContent.toLowerCase().includes(keyword) ? 'flex' : 'none';
          });
        });
      } else {
        optionsContainer.innerHTML = '<div class="flower-option-empty">暂无花灵数据</div>';
      }
    }, 0);
  } else if (propSchema.type === 'elvesSingleselect') {
    // 花灵单选下拉框
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    const selectedId = typeof value === 'number' ? value : 0;

    field.innerHTML = `
      <label>${label}${helpIcon}</label>
      <div class="flower-select-wrapper" id="${fieldId}">
        <div class="flower-select-display">
          <span class="flower-select-placeholder">加载中...</span>
          <span class="flower-select-arrow">▼</span>
        </div>
        <div class="flower-select-dropdown" style="display: none;">
          <div class="flower-select-dropdown-content">
            <div class="flower-select-header">选择花灵</div>
            <div class="flower-select-search">
              <input type="text" placeholder="搜索花灵..." class="flower-search-input">
            </div>
            <div class="flower-select-options">
              <label class="flower-option">
                <input type="radio" name="${fieldId}_radio" value="loading" disabled>
                <span>加载中...</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const wrapper = document.getElementById(fieldId);
      const display = wrapper.querySelector('.flower-select-display');
      const dropdown = wrapper.querySelector('.flower-select-dropdown');
      const optionsContainer = wrapper.querySelector('.flower-select-options');
      const searchInput = wrapper.querySelector('.flower-search-input');

      if (!flowerElvesData && window.FLOWER_ELVES_DATA) flowerElvesData = window.FLOWER_ELVES_DATA;

      if (flowerElvesData && flowerElvesData.length > 0) {
        const qualityName = (c) => ['', '凡', '普', '珍', '华', '仙'][c] || '';
        optionsContainer.innerHTML = flowerElvesData.map(item => {
          const checked = item.id === selectedId ? 'checked' : '';
          return `
            <label class="flower-option">
              <input type="radio" name="${fieldId}_radio" value="${item.id}" ${checked}>
              <span>${item.name} (${qualityName(item.color)})</span>
            </label>
          `;
        }).join('');

        const updateDisplay = () => {
          const checkedRadio = optionsContainer.querySelector('input[type="radio"]:checked');
          display.innerHTML = '';
          if (!checkedRadio) {
            const placeholderSpan = document.createElement('span');
            placeholderSpan.className = 'flower-select-placeholder';
            placeholderSpan.textContent = '请选择';
            display.appendChild(placeholderSpan);
          } else {
            const tag = document.createElement('div');
            tag.className = 'flower-tag';
            tag.innerHTML = `
              <span class="flower-tag-text">${checkedRadio.parentElement.querySelector('span').textContent}</span>
              <span class="flower-tag-close" data-id="${checkedRadio.value}">×</span>
            `;
            tag.querySelector('.flower-tag-close').addEventListener('click', (e) => {
              e.stopPropagation();
              checkedRadio.checked = false;
              updateDisplay();
            });
            display.appendChild(tag);
          }
          const arrow = document.createElement('span');
          arrow.className = 'flower-select-arrow';
          arrow.textContent = '▼';
          display.appendChild(arrow);
        };

        updateDisplay();

        display.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = 'flex';
          document.body.style.overflow = 'hidden';
        });
        dropdown.addEventListener('click', (e) => {
          if (e.target === dropdown) {
            dropdown.style.display = 'none';
            document.body.style.overflow = '';
          }
        });
        optionsContainer.addEventListener('change', () => {
          updateDisplay();
          dropdown.style.display = 'none';
          document.body.style.overflow = '';
        });
        searchInput.addEventListener('input', (e) => {
          const keyword = e.target.value.toLowerCase();
          optionsContainer.querySelectorAll('.flower-option').forEach(option => {
            option.style.display = option.querySelector('span').textContent.toLowerCase().includes(keyword) ? 'flex' : 'none';
          });
        });
      } else {
        optionsContainer.innerHTML = '<div class="flower-option-empty">暂无花灵数据</div>';
      }
    }, 0);
  } else if (propSchema.type === 'vaseMultiselect') {
    // 花瓶多选下拉框（带复选框）
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    const selectedIds = Array.isArray(value) ? value : [];
    
    field.innerHTML = `
      <label>${label}${helpIcon}</label>
      <div class="flower-select-wrapper" id="${fieldId}">
        <div class="flower-select-display">
          <span class="flower-select-placeholder">加载中...</span>
          <span class="flower-select-arrow">▼</span>
        </div>
        <div class="flower-select-dropdown" style="display: none;">
          <div class="flower-select-dropdown-content">
            <div class="flower-select-header">选择花瓶</div>
            <div class="flower-select-search">
              <input type="text" placeholder="搜索花瓶..." class="flower-search-input">
            </div>
            <div class="flower-select-options">
              <label class="flower-option">
                <input type="checkbox" value="loading" disabled>
                <span>加载中...</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // 异步加载花瓶选项
    setTimeout(() => {
      const wrapper = document.getElementById(fieldId);
      const display = wrapper.querySelector('.flower-select-display');
      const placeholder = wrapper.querySelector('.flower-select-placeholder');
      const dropdown = wrapper.querySelector('.flower-select-dropdown');
      const optionsContainer = wrapper.querySelector('.flower-select-options');
      const searchInput = wrapper.querySelector('.flower-search-input');
      
      console.log('[VaseSelect] 初始化花瓶选择器');
      console.log('[VaseSelect] fieldId:', fieldId);
      console.log('[VaseSelect] vasesData:', vasesData);
      
      // 如果 vasesData 为空，尝试从 window.VASES_DATA 重新加载
      if (!vasesData && window.VASES_DATA) {
        console.log('[VaseSelect] vasesData 为空，从 window.VASES_DATA 重新加载');
        vasesData = window.VASES_DATA;
      }
      
      if (vasesData && vasesData.length > 0) {
        console.log('[VaseSelect] ✅ 开始渲染', vasesData.length, '个花瓶');
        // 渲染选项
        optionsContainer.innerHTML = vasesData.map(vase => {
          const checked = selectedIds.includes(vase.id) ? 'checked' : '';
          const qualityName = ['', '凡', '普', '珍', '华', '仙'][vase.color] || '';
          return `
            <label class="flower-option">
              <input type="checkbox" value="${vase.id}" ${checked}>
              <span>${vase.name} (${qualityName})</span>
            </label>
          `;
        }).join('');
        
        // 更新显示（显示标签）
        const updateDisplay = () => {
          const checkedBoxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
          
          // 清空显示框
          display.innerHTML = '';
          
          if (checkedBoxes.length === 0) {
            // 没有选中，显示占位符
            const placeholderSpan = document.createElement('span');
            placeholderSpan.className = 'flower-select-placeholder';
            placeholderSpan.textContent = '请选择花瓶';
            display.appendChild(placeholderSpan);
          } else {
            // 显示标签
            checkedBoxes.forEach(cb => {
              const vaseId = cb.value;
              const vaseName = cb.parentElement.querySelector('span').textContent;
              
              const tag = document.createElement('div');
              tag.className = 'flower-tag';
              tag.innerHTML = `
                <span class="flower-tag-text">${vaseName}</span>
                <span class="flower-tag-close" data-id="${vaseId}">×</span>
              `;
              
              // 点击删除按钮
              tag.querySelector('.flower-tag-close').addEventListener('click', (e) => {
                e.stopPropagation();
                cb.checked = false;
                updateDisplay();
              });
              
              display.appendChild(tag);
            });
          }
          
          // 添加箭头
          const arrow = document.createElement('span');
          arrow.className = 'flower-select-arrow';
          arrow.textContent = '▼';
          display.appendChild(arrow);
        };
        
        updateDisplay();
        
        // 点击显示框打开弹出层
        display.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = 'flex';
          // 防止页面滚动
          document.body.style.overflow = 'hidden';
        });
        
        // 点击遮罩层关闭弹出层
        dropdown.addEventListener('click', (e) => {
          // 只有点击遮罩层本身才关闭，点击内容区域不关闭
          if (e.target === dropdown) {
            dropdown.style.display = 'none';
            document.body.style.overflow = '';
          }
        });
        
        // 复选框变化时更新显示
        optionsContainer.addEventListener('change', updateDisplay);
        
        // 搜索功能
        searchInput.addEventListener('input', (e) => {
          const keyword = e.target.value.toLowerCase();
          const options = optionsContainer.querySelectorAll('.flower-option');
          options.forEach(option => {
            const text = option.querySelector('span').textContent.toLowerCase();
            option.style.display = text.includes(keyword) ? 'flex' : 'none';
          });
        });
      } else {
        console.log('[VaseSelect] ❌ 没有花瓶数据');
        optionsContainer.innerHTML = '<div class="flower-option-empty">暂无花瓶数据</div>';
        placeholder.textContent = '暂无数据';
      }
    }, 0);
  } else if (propSchema.type === 'demandEditor') {
    // 特需编辑器
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    const demandList = Array.isArray(value) ? value : [];
    
    field.innerHTML = `
      <label>${label}${helpIcon}</label>
      <div class="demand-editor" id="${fieldId}">
        <button type="button" class="demand-add-btn">+ 添加规则</button>
        <div class="demand-list"></div>
      </div>
    `;
    
    // 异步渲染需求列表
    setTimeout(() => {
      const editor = document.getElementById(fieldId);
      const addBtn = editor.querySelector('.demand-add-btn');
      const listContainer = editor.querySelector('.demand-list');
      
      // 渲染需求列表
      const renderList = () => {
        // 更新 DOM 属性，用于保存配置
        editor.setAttribute('data-demand-list', JSON.stringify(demandList));
        
        if (demandList.length === 0) {
          listContainer.innerHTML = '<div class="demand-empty">暂无规则，点击上方按钮添加</div>';
        } else {
          listContainer.innerHTML = demandList.map((item, index) => {
            const flower = flowersData.find(f => f.id === item.flowerId);
            const flowerName = flower ? flower.name : `未知花卉(${item.flowerId})`;
            const qualityName = flower ? ['', '凡', '普', '珍', '华', '仙'][flower.color] || '' : '';
            return `
              <div class="demand-item">
                <span class="demand-flower">${flowerName} ${qualityName ? `(${qualityName})` : ''}</span>
                <span class="demand-count">${item.count}</span>
                <button type="button" class="demand-delete-btn" data-index="${index}">删除</button>
              </div>
            `;
          }).join('');
          
          // 绑定删除按钮事件
          listContainer.querySelectorAll('.demand-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const index = parseInt(btn.getAttribute('data-index'));
              demandList.splice(index, 1);
              renderList();
            });
          });
        }
      };
      
      renderList();
      
      // 点击添加按钮
      const dialogOptions = propSchema.countLabel || propSchema.countMax ? {
        countLabel: propSchema.countLabel,
        countMax: propSchema.countMax,
        countDefault: propSchema.countDefault
      } : undefined;
      addBtn.addEventListener('click', () => {
        showDemandAddDialog((flowerId, count) => {
          // 检查是否已存在
          const existingIndex = demandList.findIndex(item => item.flowerId === flowerId);
          if (existingIndex >= 0) {
            // 更新数量
            demandList[existingIndex].count = count;
          } else {
            // 添加新规则
            demandList.push({ flowerId, count });
          }
          renderList();
        }, dialogOptions);
      });
    }, 0);
  } else if (propSchema.type === 'array') {
    // 数组 -> 文本框（逗号分隔）
    const arrayValue = Array.isArray(value) ? value.join(',') : '';
    field.innerHTML = `
      <label>${label}</label>
      <input type="text" id="${fieldId}" value="${arrayValue}" placeholder="多个值用逗号分隔">
    `;
  } else if (propSchema.type === 'sortableList') {
    // 可拖拽排序列表
    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    const listValue = Array.isArray(value) && value.length > 0 ? value : (propSchema.default || []);
    field.innerHTML = `
      <label>${label}${helpIcon}</label>
      <div class="sortable-hint">拖动左侧 ☰ 可排序</div>
      <div class="sortable-list" id="${fieldId}"></div>
    `;
    setTimeout(() => {
      const container = document.getElementById(fieldId);
      if (!container) return;
      let items = JSON.parse(JSON.stringify(listValue));

      const save = () => container.setAttribute('data-sortable-list', JSON.stringify(items));

      const sortItems = () => {
        const enabled = items.filter(i => i.enabled);
        const disabled = items.filter(i => !i.enabled);
        items.splice(0, items.length, ...enabled, ...disabled);
      };

      const render = () => {
        sortItems();
        container.innerHTML = '';
        items.forEach((item, index) => {
          const row = document.createElement('div');
          row.className = 'sortable-item' + (item.enabled ? '' : ' sortable-disabled');
          row.setAttribute('draggable', 'true');
          row.setAttribute('data-index', index);
          row.innerHTML = `
            <span class="sortable-handle" title="拖动排序">☰</span>
            <span class="sortable-label">${item.label}</span>
            <label class="switch sortable-switch">
              <input type="checkbox" ${item.enabled ? 'checked' : ''}>
              <span class="switch-slider"></span>
            </label>
          `;
          row.querySelector('input[type="checkbox"]').addEventListener('change', e => {
            items[index].enabled = e.target.checked;
            render();
          });
          // 拖拽事件（PC）
          row.addEventListener('dragstart', e => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
            row.classList.add('sortable-dragging');
          });
          row.addEventListener('dragend', () => row.classList.remove('sortable-dragging'));
          row.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; row.classList.add('sortable-over'); });
          row.addEventListener('dragleave', () => row.classList.remove('sortable-over'));
          row.addEventListener('drop', e => {
            e.preventDefault();
            row.classList.remove('sortable-over');
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = parseInt(row.getAttribute('data-index'));
            if (fromIndex !== toIndex) {
              const moved = items.splice(fromIndex, 1)[0];
              items.splice(toIndex, 0, moved);
              save();
              render();
            }
          });
          // 拖拽事件（手机触摸）—— 只绑在手柄上，不影响 checkbox 点击
          let placeholder = null;
          const handle = row.querySelector('.sortable-handle');
          handle.addEventListener('touchstart', e => {
            e.preventDefault();
            const rect = row.getBoundingClientRect();
            placeholder = document.createElement('div');
            placeholder.className = 'sortable-placeholder';
            placeholder.style.height = rect.height + 'px';
            row.parentNode.insertBefore(placeholder, row.nextSibling);
            row.style.position = 'fixed';
            row.style.zIndex = '9999';
            row.style.width = rect.width + 'px';
            row.style.left = rect.left + 'px';
            row.style.top = rect.top + 'px';
            row.style.opacity = '0.85';
            row.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            row._touchOffsetY = e.touches[0].clientY - rect.top;
          });
          handle.addEventListener('touchmove', e => {
            if (!placeholder) return;
            e.preventDefault();
            const touch = e.touches[0];
            row.style.top = (touch.clientY - row._touchOffsetY) + 'px';
            row.style.pointerEvents = 'none';
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            row.style.pointerEvents = '';
            const toRow = target && target.closest('.sortable-item');
            if (toRow && toRow !== row && toRow !== placeholder) {
              const toRect = toRow.getBoundingClientRect();
              const isAfter = touch.clientY > toRect.top + toRect.height / 2;
              if (isAfter) {
                toRow.parentNode.insertBefore(placeholder, toRow.nextSibling);
              } else {
                toRow.parentNode.insertBefore(placeholder, toRow);
              }
            }
          });
          handle.addEventListener('touchend', e => {
            if (!placeholder) return;
            row.style.position = '';
            row.style.zIndex = '';
            row.style.width = '';
            row.style.left = '';
            row.style.top = '';
            row.style.opacity = '';
            row.style.boxShadow = '';
            if (placeholder.parentNode) {
              placeholder.parentNode.insertBefore(row, placeholder);
              placeholder.remove();
            }
            placeholder = null;
            const newOrder = [];
            container.querySelectorAll('.sortable-item').forEach(r => {
              const i = parseInt(r.getAttribute('data-index'));
              if (!isNaN(i)) newOrder.push(items[i]);
            });
            items.splice(0, items.length, ...newOrder);
            container.querySelectorAll('.sortable-item').forEach((r, i) => r.setAttribute('data-index', i));
            save();
          });
          container.appendChild(row);
        });
        save();
      };
      render();
    }, 0);
  } else if (propSchema.type === 'filterRuleList') {
    const mode = propSchema.mode || 'take';
    const modeConfig = {
      take:   { field: 'enabled',   onLabel: '接取', offLabel: '不接' },
      cancel: { field: 'canCancel', onLabel: '可取消', offLabel: '不取消' },
      delete: { field: 'canDelete', onLabel: '可删',  offLabel: '不删'  }
    }[mode] || { field: 'enabled', onLabel: '接取', offLabel: '不接' };

    const helpIcon = propSchema.help ? `<span class="help-icon" data-help="${propSchema.help}">ⓘ</span>` : '';
    const listValue = Array.isArray(value) && value.length > 0 ? value : JSON.parse(JSON.stringify(propSchema.default || []));

    field.innerHTML = `
      <label>${label}${helpIcon}</label>
      <div class="filter-rule-list" id="${fieldId}"></div>
    `;

    setTimeout(() => {
      const container = document.getElementById(fieldId);
      if (!container) return;
      const items = JSON.parse(JSON.stringify(listValue));
      const save = () => container.setAttribute('data-filter-rule-list', JSON.stringify(items));

      const renderMemberList = (membersDiv, item) => {
        membersDiv.innerHTML = '';
        const inputRow = document.createElement('div');
        inputRow.className = 'frl-member-input';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = '输入玩家名，回车添加';
        const hint = document.createElement('div');
        hint.className = 'frl-member-hint';
        hint.textContent = '格式：大区.名称，如 s138.大宗师';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '+ 添加';
        const addMember = () => {
          const name = inp.value.trim();
          if (!name) return;
          if (!item.members) item.members = [];
          if (!item.members.includes(name)) { item.members.push(name); save(); renderMemberList(membersDiv, item); }
          inp.value = '';
        };
        btn.addEventListener('click', addMember);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addMember(); } });
        inputRow.appendChild(inp);
        inputRow.appendChild(btn);
        membersDiv.appendChild(inputRow);
        membersDiv.appendChild(hint);

        const tags = document.createElement('div');
        tags.className = 'frl-member-tags';
        (item.members || []).forEach((name, mi) => {
          const tag = document.createElement('span');
          tag.className = 'frl-member-tag';
          tag.innerHTML = `${name} <span class="frl-member-remove">×</span>`;
          tag.querySelector('.frl-member-remove').addEventListener('click', () => {
            item.members.splice(mi, 1);
            save();
            renderMemberList(membersDiv, item);
          });
          tags.appendChild(tag);
        });
        membersDiv.appendChild(tags);
      };

      const render = () => {
        container.innerHTML = '';
        items.forEach((item) => {
          const tf = modeConfig.field;
          const isOn = !!item[tf];
          const hasMembers = item.key === 'otherUpgrade';

          const row = document.createElement('div');
          row.className = 'frl-row';
          row.innerHTML = `
            <div class="frl-top">
              <span class="frl-label">${item.label}</span>
              <label class="switch frl-switch">
                <input type="checkbox" class="frl-toggle" ${isOn ? 'checked' : ''}>
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="frl-score-group">
              <span class="frl-score-sep">分数</span>
              <input type="text" inputmode="numeric" class="frl-min" value="${item.minScore || 0}" ${!isOn ? 'disabled' : ''} oninput="this.value=this.value.replace(/[^0-9]/g,'')">
              <span class="frl-score-sep">~</span>
              <input type="text" inputmode="numeric" class="frl-max" value="${item.maxScore !== undefined ? item.maxScore : 999}" ${!isOn ? 'disabled' : ''} oninput="this.value=this.value.replace(/[^0-9]/g,'')">
            </div>
            ${hasMembers ? `<div class="frl-member-row">
              <select class="frl-member-mode" ${!isOn ? 'disabled' : ''}>
                <option value="all" ${(item.memberMode || 'all') === 'all' ? 'selected' : ''}>全部成员</option>
                <option value="specific" ${item.memberMode === 'specific' ? 'selected' : ''}>指定成员</option>
              </select>
            </div>` : ''}
          `;

          const toggle   = row.querySelector('.frl-toggle');
          const minInput = row.querySelector('.frl-min');
          const maxInput = row.querySelector('.frl-max');
          const modeSelect = row.querySelector('.frl-member-mode');

          let membersDiv = null;
          if (hasMembers) {
            membersDiv = document.createElement('div');
            membersDiv.className = 'frl-members';
            membersDiv.style.display = (isOn && item.memberMode === 'specific') ? '' : 'none';
            renderMemberList(membersDiv, item);
          }

          toggle.addEventListener('change', e => {
            item[tf] = e.target.checked;
            minInput.disabled = !item[tf];
            maxInput.disabled = !item[tf];
            if (modeSelect) modeSelect.disabled = !item[tf];
            if (membersDiv) membersDiv.style.display = (item[tf] && item.memberMode === 'specific') ? '' : 'none';
            save();
          });
          minInput.addEventListener('input', e => { item.minScore = parseInt(e.target.value) || 0; save(); });
          maxInput.addEventListener('input', e => { item.maxScore = parseInt(e.target.value) || 0; save(); });
          if (modeSelect) {
            modeSelect.addEventListener('change', e => {
              item.memberMode = e.target.value;
              if (membersDiv) membersDiv.style.display = (item[tf] && item.memberMode === 'specific') ? '' : 'none';
              save();
            });
          }

          container.appendChild(row);
          if (membersDiv) container.appendChild(membersDiv);
        });
        save();
      };
      render();
    }, 0);
  }

  // 处理 showWhen 条件显示
  if (propSchema.showWhen) {
    const showWhenField = Object.keys(propSchema.showWhen)[0];
    const showWhenValue = propSchema.showWhen[showWhenField];
    
    // 存储 showWhen 信息到 field 元素
    field.setAttribute('data-show-when-field', showWhenField);
    field.setAttribute('data-show-when-value', showWhenValue);
    
    // 初始化显示状态
    const groupKey = fieldId.split('_')[0];
    const controlFieldId = `${groupKey}_${showWhenField}`;
    
    setTimeout(() => {
      const controlElement = document.getElementById(controlFieldId);
      if (controlElement) {
        // 初始检查
        const checkVisibility = () => {
          const currentValue = controlElement.value;
          const matched = Array.isArray(showWhenValue) ? showWhenValue.includes(currentValue) : currentValue === showWhenValue;
          if (matched) {
            field.style.display = '';
          } else {
            field.style.display = 'none';
          }
        };
        
        checkVisibility();
        
        // 监听控制字段的变化
        controlElement.addEventListener('change', checkVisibility);
      }
    }, 0);
  }
  
  return field;
}

// 枚举值的中文标签
function getEnumLabel(value) {
  const labels = {
    'random': '随机模式',
    'flower': '指定花朵',
    'color': '指定颜色'
  };
  return labels[value] || value;
}

// 从表单读取配置
function readFormData() {
  const result = {};
  const properties = configSchema.properties || {};
  
  Object.keys(properties).forEach(groupKey => {
    result[groupKey] = {};
    const groupProps = properties[groupKey].properties || {};
    
    Object.keys(groupProps).forEach(key => {
      const fieldId = `${groupKey}_${key}`;
      const element = document.getElementById(fieldId);
      const propSchema = groupProps[key];
      
      if (!element) return;
      
      if (propSchema.type === 'boolean') {
        result[groupKey][key] = element.checked;
      } else if (propSchema.type === 'select') {
        result[groupKey][key] = element.value;
      } else if (propSchema.type === 'range') {
        const minSlider = element.querySelector('.range-min');
        const maxSlider = element.querySelector('.range-max');
        result[groupKey][key] = [parseInt(minSlider.value), parseInt(maxSlider.value)];
      } else if (propSchema.type === 'multiselect') {
        const checkboxes = element.querySelectorAll('input[type="checkbox"]:checked');
        result[groupKey][key] = Array.from(checkboxes).map(cb => parseInt(cb.value));
      } else if (propSchema.type === 'flowerMultiselect') {
        const checkboxes = element.querySelectorAll('input[type="checkbox"]:checked');
        result[groupKey][key] = Array.from(checkboxes).map(cb => parseInt(cb.value));
      } else if (propSchema.type === 'flowerArtMultiselect') {
        const checkboxes = element.querySelectorAll('input[type="checkbox"]:checked');
        result[groupKey][key] = Array.from(checkboxes).map(cb => parseInt(cb.value));
      } else if (propSchema.type === 'vaseMultiselect') {
        const checkboxes = element.querySelectorAll('input[type="checkbox"]:checked');
        result[groupKey][key] = Array.from(checkboxes).map(cb => parseInt(cb.value));
      } else if (propSchema.type === 'elvesMultiselect') {
        const checkboxes = element.querySelectorAll('input[type="checkbox"]:checked');
        result[groupKey][key] = Array.from(checkboxes).map(cb => parseInt(cb.value));
      } else if (propSchema.type === 'elvesSingleselect') {
        const radio = element.querySelector('input[type="radio"]:checked');
        result[groupKey][key] = radio ? parseInt(radio.value) : 0;
      } else if (propSchema.type === 'timeRangeList') {
        const data = element.getAttribute('data-time-range-list');
        result[groupKey][key] = data ? JSON.parse(data) : [];
      } else if (propSchema.type === 'intRange') {
        result[groupKey][key] = parseInt(element.value) || 0;
      } else if (propSchema.type === 'integer') {
        let intVal = parseInt(element.value) || 0;
        const intMin = propSchema.min !== undefined ? propSchema.min : (propSchema.minimum !== undefined ? propSchema.minimum : undefined);
        const intMax = propSchema.max !== undefined ? propSchema.max : (propSchema.maximum !== undefined ? propSchema.maximum : undefined);
        if (intMin !== undefined && intVal < intMin) intVal = intMin;
        if (intMax !== undefined && intVal > intMax) intVal = intMax;
        result[groupKey][key] = intVal;
      } else if (propSchema.type === 'number') {
        result[groupKey][key] = parseFloat(element.value) || 0;
      } else if (propSchema.type === 'string') {
        result[groupKey][key] = element.value;
      } else if (propSchema.type === 'memberList') {
        const data = element.getAttribute('data-member-list');
        result[groupKey][key] = data ? JSON.parse(data) : [];
      } else if (propSchema.type === 'demandEditor') {
        // 从 demandList 变量中获取数据（在 createFieldElement 中定义）
        // 这里需要从 DOM 中读取存储的数据
        const demandListData = element.getAttribute('data-demand-list');
        result[groupKey][key] = demandListData ? JSON.parse(demandListData) : [];
      } else if (propSchema.type === 'sortableList') {
        const data = element.getAttribute('data-sortable-list');
        result[groupKey][key] = data ? JSON.parse(data) : (propSchema.default || []);
      } else if (propSchema.type === 'filterRuleList') {
        const data = element.getAttribute('data-filter-rule-list');
        result[groupKey][key] = data ? JSON.parse(data) : (propSchema.default || []);
      } else if (propSchema.type === 'array') {
        const strValue = element.value.trim();
        if (strValue) {
          result[groupKey][key] = strValue.split(',').map(v => {
            const trimmed = v.trim();
            const num = parseInt(trimmed);
            return isNaN(num) ? trimmed : num;
          });
        } else {
          result[groupKey][key] = [];
        }
      }
    });
  });
  
  return result;
}

// 检测配置是否修改
function checkIfChanged() {
  if (!originalConfig || isInitializing) return;
  
  const currentData = readFormData();
  const formChanged = JSON.stringify(currentData) !== JSON.stringify(originalConfig);
  
  // 如果表单有变化，或者 hasUnsavedChanges 已经为 true（可能是 land1-editor 等自定义组件修改的）
  const changed = formChanged || hasUnsavedChanges;
  
  if (changed !== hasUnsavedChanges) {
    hasUnsavedChanges = changed;
    console.log('[AutoConfig] Config changed:', changed);
    
    // 通知父组件
    if (window.parent) {
      window.parent.postMessage({
        type: 'configChanged',
        hasChanges: changed
      }, '*');
    }
  }
}

// 初始化变化检测
function initChangeDetection() {
  console.log('[AutoConfig] Initializing change detection...');
  
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('change', checkIfChanged);
    input.addEventListener('input', checkIfChanged);
  });
  
  console.log('[AutoConfig] Change detection initialized, monitoring', inputs.length, 'inputs');
}

// 填充表单
function fillForm() {
  if (!configSchema) {
    console.error('[AutoConfig] Schema not loaded');
    return;
  }
  
  generateForm(configSchema, config);
  
  // 延迟初始化：等 timeRangeList 等异步渲染（setTimeout 0）完成后再读取原始配置
  isInitializing = true;
  setTimeout(() => {
    originalConfig = readFormData();
    hasUnsavedChanges = false;
    isInitializing = false;
    console.log('[AutoConfig] Original config saved:', originalConfig);
    // 初始化变化检测
    initChangeDetection();
  }, 50);
}

// 父窗口调用：重新显示 loading
window.showLoading = function() {
  console.log('[AutoConfig] ========== showLoading called ==========');
  toggleLoading(true);
  console.log('[AutoConfig] ✅ Loading shown');
}

// 父窗口调用：重置折叠状态
window.resetCollapseState = function() {
  console.log('[AutoConfig] ========== resetCollapseState called ==========');
  const details = document.querySelectorAll('details.group');
  details.forEach(detail => {
    detail.removeAttribute('open');
  });
  console.log('[AutoConfig] ✅ All panels collapsed');
}

// 父窗口调用的更新配置方法
window.updateConfigFromParent = function(configJson) {
  console.log('[AutoConfig] ========== updateConfigFromParent called ==========');
  console.log('[AutoConfig] Received config:', configJson);
  
  if (configJson) {
    try {
      const parsedConfig = JSON.parse(configJson);
      console.log('[AutoConfig] Parsed config successfully:', parsedConfig);
      
      // 合并配置
      config = mergeConfig(generateDefaultConfig(configSchema), parsedConfig);
      console.log('[AutoConfig] Merged config:', config);
      
      fillForm();
      console.log('[AutoConfig] Form generated and filled');
      
      // 隐藏加载动画
      toggleLoading(false);
      console.log('[AutoConfig] ✅ Loading hidden, content shown');
      console.log('[AutoConfig] ========== Update complete ==========');
    } catch (e) {
      console.error('[AutoConfig] ❌ Parse/update failed:', e);
      console.error('[AutoConfig] Error stack:', e.stack);
    }
  } else {
    console.warn('[AutoConfig] ⚠️ Received empty/null config');
  }
}

// 保存配置
function saveConfig() {
  console.log('[AutoConfig] ========== saveConfig called ==========');

  // 校验 pattern 字段
  const properties = configSchema.properties || {};
  for (const groupKey of Object.keys(properties)) {
    const groupProps = properties[groupKey].properties || {};
    for (const key of Object.keys(groupProps)) {
      const propSchema = groupProps[key];
      if (propSchema.type === 'string' && propSchema.pattern && !propSchema.enum) {
        const el = document.getElementById(`${groupKey}_${key}`);
        if (el && el.value !== '' && !new RegExp(propSchema.pattern).test(el.value)) {
          showToast(`${propSchema.description || key} 格式不正确`);
          el.focus();
          return;
        }
      }
    }
  }

  config = readFormData();
  const configJson = JSON.stringify(config);
  
  if (window.parent && window.parent.saveScriptConfig) {
    window.parent.saveScriptConfig(configJson);
    
    // 保存成功后更新原始配置，重置修改标记
    originalConfig = deepClone(config);
    hasUnsavedChanges = false;
    console.log('[AutoConfig] Config saved, reset change flag');
    
    // 通知父组件
    window.parent.postMessage({
      type: 'configChanged',
      hasChanges: false
    }, '*');
  } else {
    showToast('保存成功（开发模式）');
    console.log('配置:', configJson);
  }
}

// 加载配置
async function loadConfig() {
  console.log('[AutoConfig] 📥 loadConfig() called');
  
  // 先加载花卉和花瓶数据（同步）
  loadFlowersData();
  loadVasesData();
  
  if (window.parent && window.parent.getScriptConfig) {
    console.log('[AutoConfig] Parent window available, calling getScriptConfig()');
    try {
      const savedConfig = window.parent.getScriptConfig();
      console.log('[AutoConfig] Received from parent:', savedConfig);
      
      if (savedConfig && savedConfig !== '{}' && savedConfig !== '') {
        console.log('[AutoConfig] Valid config received, parsing...');
        const parsedConfig = JSON.parse(savedConfig);
        console.log('[AutoConfig] Parsed config:', parsedConfig);
        
        // 合并配置
        config = mergeConfig(generateDefaultConfig(configSchema), parsedConfig);
        console.log('[AutoConfig] Merged config:', config);
        
        // 重新生成表单
        fillForm();
        console.log('[AutoConfig] ✅ Form updated from loadConfig()');
      } else {
        console.log('[AutoConfig] ⚠️ Empty or invalid config, using default');
      }
    } catch (e) {
      console.error('[AutoConfig] ❌ 配置加载失败', e);
      console.error('[AutoConfig] Error stack:', e.stack);
    }
  } else {
    console.log('[AutoConfig] ⚠️ Parent window not available, using default config');
  }
}

// 合并配置（深度合并）
function mergeConfig(defaultConfig, savedConfig) {
  const result = deepClone(defaultConfig);
  
  Object.keys(savedConfig).forEach(groupKey => {
    if (result[groupKey]) {
      Object.keys(savedConfig[groupKey]).forEach(key => {
        result[groupKey][key] = savedConfig[groupKey][key];
      });
    } else {
      result[groupKey] = savedConfig[groupKey];
    }
  });
  
  return result;
}

// 页面加载时初始化
window.addEventListener('load', async function() {
  console.log('[AutoConfig] Page loaded, loading schema...');
  
  // 先加载花卉、花瓶和花艺品数据
  loadFlowersData();
  loadVasesData();
  loadFlowerArtData();
  loadFlowerElvesData();
  
  // 加载 schema
  configSchema = await loadSchema();
  
  if (!configSchema) {
    console.error('[AutoConfig] Failed to load schema');
    showToast('配置加载失败');
    return;
  }
  
  // 生成默认配置
  const defaultConfig = generateDefaultConfig(configSchema);
  console.log('[AutoConfig] Default config generated:', defaultConfig);
  
  // 先尝试加载保存的配置
  let savedConfig = null;
  if (window.parent && window.parent.getScriptConfig) {
    console.log('[AutoConfig] Attempting to load saved config from parent...');
    try {
      const savedConfigStr = window.parent.getScriptConfig();
      console.log('[AutoConfig] Received from parent:', savedConfigStr);
      
      if (savedConfigStr && savedConfigStr !== '{}' && savedConfigStr !== '') {
        console.log('[AutoConfig] Valid config received, parsing...');
        savedConfig = JSON.parse(savedConfigStr);
        console.log('[AutoConfig] Parsed config:', savedConfig);
      }
    } catch (e) {
      console.error('[AutoConfig] ❌ 配置加载失败', e);
    }
  }
  
  // 迁移旧格式：flowerMarket.preferFriends 从逗号分隔字符串迁移为数组
  if (savedConfig && savedConfig.flowerMarket && typeof savedConfig.flowerMarket.preferFriends === 'string') {
    const str = savedConfig.flowerMarket.preferFriends.trim();
    savedConfig.flowerMarket.preferFriends = str ? str.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
  }

  // 合并配置（如果有保存的配置则合并，否则使用默认配置）
  if (savedConfig) {
    config = mergeConfig(defaultConfig, savedConfig);
    console.log('[AutoConfig] ✅ Using merged config:', config);
  } else {
    config = defaultConfig;
    console.log('[AutoConfig] ⚠️ Using default config');
  }
  
  // 生成表单（但不隐藏 loading，等待父窗口更新配置后再隐藏）
  fillForm();
  
  // 开发模式：如果是直接打开HTML文件（没有父窗口或父窗口是自己），自动隐藏loading
  const isDevelopmentMode = !window.parent || window.parent === window || window.location.protocol === 'file:';
  if (isDevelopmentMode) {
    console.log('[AutoConfig] 🔧 Development mode detected, auto-hiding loading...');
    toggleLoading(false);
  } else {
    // 生产模式：等待父窗口更新配置后再隐藏
    console.log('[AutoConfig] Page initialized, waiting for parent to update config...');
  }
});
