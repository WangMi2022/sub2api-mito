export default {
  batchImageGuide: {
    title: '图片批量生成',
    description: '一次提交多条提示词，任务完成后可统一下载图片结果'
  },
  // Home Page
  home: {
    mito: {
      heroSubtitle: '一个密钥，畅用国产大模型',
      heroDescription: '一站式接入 Kimi、GLM、DeepSeek、MiniMax，让模型调用、密钥与用量管理更简单。',
      heroBadge: '国产大模型 · 统一接入',
      terminalLabel: 'API 调用示例',
      stats: {
        models: '国模生态',
        key: '统一密钥',
        failover: '多路调度',
        billing: '费用可查',
        routingValue: '自动',
        billingValue: '按量'
      },
      steps: {
        title: '三步接入，开始调用',
        subtitle: '从创建密钥到查看用量，在一个控制台完成',
        connect: {
          title: '创建密钥',
          desc: '登录控制台生成 API Key，按分组选择可用模型与额度。'
        },
        call: {
          title: '配置调用',
          desc: '在兼容的 SDK 中配置本站 API 地址与密钥，选择模型开始调用。'
        },
        monitor: {
          title: '查看用量',
          desc: '查看请求日志、Token 与费用明细，按需管理调用额度。'
        }
      },
      providers: {
        kimi: 'Kimi',
        glm: 'GLM',
        deepseek: 'DeepSeek',
        minimax: 'MiniMax'
      },
      core: {
        eyebrow: 'Core Capabilities',
        title: '核心功能',
        subtitle: '一个密钥接到底：接入、调度、计费三层能力收束在同一条链路上，不额外引入中间层。',
        items: {
          gateway: {
            title: '统一接入',
            desc: '一个 OpenAI 兼容端点接全部已上架模型，继续沿用现有 SDK 与客户端，无需为每家供应商改代码或维护多套密钥。',
            tags: { compatible: 'OpenAI 兼容', key: '单一密钥', endpoint: '统一端点' }
          },
          routing: {
            title: '多路调度',
            desc: '同一模型背后挂多个上游账号，按实时健康度择路；单账号报错时自动切换，对话与会话保持在同一条链路上。',
            tags: { pool: '账号池', failover: '自动切换', isolation: '分组隔离' }
          },
          billing: {
            title: '用量与计费',
            desc: '按实际 Token 计费，倍率、阶梯、缓存与分时规则在请求前即可核对；每日/每周/每月额度可分别设上限。',
            tags: { usage: '按量计费', quota: '额度上限', detail: '明细可查' }
          }
        },
        facts: {
          key: { label: '接入方式', value: '单一 API 密钥' },
          sdk: { label: '协议兼容', value: 'OpenAI 兼容' },
          route: { label: '故障处理', value: '自动切换' },
          billing: { label: '计费口径', value: '按 Token 实付' }
        }
      },
      playground: {
        eyebrow: 'Interactive API Sandbox',
        title: '交互式 API 调试沙盒',
        subtitle: '模拟标准 OpenAI SDK 请求，直观看到路由、延迟与 Token 成本——不发起真实调用，也不消耗额度。',
        endpointLabel: '请求 API 端点',
        modelLabel: '调试目标模型',
        tokensInput: '输入 Tokens',
        tokensOutput: '输出 Tokens',
        run: '运行模拟请求',
        running: '请求路由中...',
        placeholder: '正在准备模拟响应…',
        status: 'STATUS',
        statePreview: '示例预览',
        stateBusy: 'ROUTING',
        stateOk: '200 OK',
        estimate: '本次预估',
        rate: '生效倍率',
        rateSuffix: '×',
        empty: '模型价目暂不可用，稍后会自动重试。'
      },
      workbench: {
        title: '接入工作台',
        subtitle: '多态策略流控、资费即时精算与高可用分发沙盒，收束于单一极客视界。',
        enter: '接入工作台',
        consoleTitle: 'MITO GATEWAY CONSOLE · 控制面',
        ready: '网关就绪',
        standby: '备用池: {count}',
        activeModel: '激活模型',
        packetDelay: '首包延迟',
        topology: '实时网关拓扑图',
        policyTitle: '网关高阶调度策略',
        channelTitle: '激活分发通道',
        policies: {
          auto: '自适应最优',
          lowTtft: '极速首包',
          failover: '多活备用'
        },
        policyDesc: {
          auto: '全局自适应策略：实时演算边缘节点健康度、首包延时（TTFT）与热备份池负载，确保物理链路最优。',
          lowTtft: '极速首包策略：强行拉平地域差异，优先将封包调度至首字响应时延最低的极速上行边缘节点。',
          failover: '多活容灾策略：维持三级双活热备池，检测到物理上游抖动时，在 20ms 内实现无缝热切。'
        },
        volume: '月度吞吐规模精算',
        official: 'OFFICIAL',
        officialPrice: '官方参考价',
        ourPrice: '本站实付',
        monthlySaved: '网关精算月节省',
        monthUnit: '月',
        prompt: '仿真输入内容（Prompt）',
        promptPlaceholder: '输入要仿真的提示词',
        temperature: '温度（Temp）',
        endpoint: '请求端点（Endpoint）',
        runDispatch: '发起网关极速仿真调度',
        dispatching: '网关封包多态分发中...',
        outputPlaceholder: '运行仿真后，在这里查看高亮的 JSON 流',
        trace: '链路遥测 TRACE 日志',
        live: 'LIVE',
        traceReady: '网关智能控制面已上线并激活',
        tracePools: '物理路由备用池已同步（3 个热备池）',
        traceEdge: '上行边缘通道已连接 · HKG-01 Edge 激活',
        traceTopology: '握手路径建立 -> Client Edge -> MITO-Router -> {route}',
        traceUpstream: '正在连接上游 {model} · {id}（Ping: {ping}ms）',
        traceSuccess: '通道调度成功 · 费用比例 {saved}',
        savedRatio: '费用比例',
        parity: '与官价持平',
        parityNote: '本站按官方参考价计费，无额外溢价'
      },
      cta: {
        title: '让下一次灵感，即刻接入',
        description: '统一管理密钥、模型与用量，把精力留给创造。',
        button: '接入模型'
      }
    },
    viewOnGithub: '在 GitHub 上查看',
    viewDocs: '查看文档',
    docs: '文档',
    switchToLight: '切换到浅色模式',
    switchToDark: '切换到深色模式',
    dashboard: '控制台',
    login: '登录',
    getStarted: '立即开始',
    goToDashboard: '进入控制台',
    // 新增：面向用户的价值主张
    heroSubtitle: '一个密钥，畅用多个 AI 模型',
    heroDescription: '无需管理多个订阅账号，一站式接入 Claude、GPT、Gemini 等主流 AI 服务',
    tags: {
      subscriptionToApi: '订阅转 API',
      stickySession: '会话保持',
      realtimeBilling: '按量计费'
    },
    // 用户痛点区块
    painPoints: {
      title: '你是否也遇到这些问题？',
      items: {
        expensive: {
          title: '订阅费用高',
          desc: '每个 AI 服务都要单独订阅，每月支出越来越多'
        },
        complex: {
          title: '多账号难管理',
          desc: '不同平台的账号、密钥分散各处，管理起来很麻烦'
        },
        unstable: {
          title: '服务不稳定',
          desc: '单一账号容易触发限制，影响正常使用'
        },
        noControl: {
          title: '用量无法控制',
          desc: '不知道钱花在哪了，也无法限制团队成员的使用'
        }
      }
    },
    // 解决方案区块
    solutions: {
      title: '我们帮你解决',
      subtitle: '简单三步，开始省心使用 AI'
    },
    features: {
      unifiedGateway: '一键接入',
      unifiedGatewayDesc: '获取一个 API 密钥，即可调用所有已接入的 AI 模型，无需分别申请。',
      multiAccount: '稳定可靠',
      multiAccountDesc: '智能调度多个上游账号，自动切换和负载均衡，告别频繁报错。',
      balanceQuota: '用多少付多少',
      balanceQuotaDesc: '按实际使用量计费，支持设置配额上限，团队用量一目了然。'
    },
    // 优势对比
    comparison: {
      title: '为什么选择我们？',
      headers: {
        feature: '对比项',
        official: '官方订阅',
        us: '本平台'
      },
      items: {
        pricing: {
          feature: '付费方式',
          official: '固定月费，用不完也付',
          us: '按量付费，用多少付多少'
        },
        models: {
          feature: '模型选择',
          official: '单一服务商',
          us: '多模型随意切换'
        },
        management: {
          feature: '账号管理',
          official: '每个服务单独管理',
          us: '统一密钥，一站管理'
        },
        stability: {
          feature: '服务稳定性',
          official: '单账号易触发限制',
          us: '多账号池，自动切换'
        },
        control: {
          feature: '用量控制',
          official: '无法限制',
          us: '可设配额、查明细'
        }
      }
    },
    providers: {
      title: '已支持的 AI 模型',
      description: '一个 API，多种选择',
      supported: '已支持',
      soon: '即将推出',
      claude: 'Claude',
      gemini: 'Gemini',
      antigravity: 'Antigravity',
      more: '更多'
    },
    // CTA 区块
    cta: {
      title: '准备好开始了吗？',
      description: '注册即可获得免费试用额度，体验一站式 AI 服务',
      button: '免费注册'
    },
    footer: {
      allRightsReserved: '保留所有权利。'
    }
  },

  // Key Usage Query Page
  keyUsage: {
    title: 'API Key 用量查询',
    subtitle: '输入您的 API Key 以查看实时消费金额与使用状态',
    placeholder: 'sk-ant-mirror-xxxxxxxxxxxx',
    query: '查询',
    querying: '查询中...',
    privacyNote: '您的 Key 仅在浏览器本地处理，不会被存储',
    dateRange: '统计范围:',
    dateRangeToday: '今日',
    dateRange7d: '7 天',
    dateRange30d: '30 天',
    dateRange90d: '90 天',
    dateRangeCustom: '自定义',
    apply: '应用',
    used: '已使用',
    detailInfo: '详细信息',
    tokenStats: 'Token 统计',
    dailyDetail: '按日明细',
    modelStats: '模型用量统计',
    // Table headers
    date: '日期',
    model: '模型',
    requests: '请求数',
    inputTokens: '输入 Tokens',
    outputTokens: '输出 Tokens',
    cacheCreationTokens: '缓存创建',
    cacheReadTokens: '缓存读取',
    cacheWriteTokens: '缓存写入',
    totalTokens: '总 Tokens',
    cost: '费用',
    // Status
    quotaMode: 'Key 限额模式',
    walletBalance: '钱包余额',
    // Ring card titles
    totalQuota: '总额度',
    limit5h: '5 小时限额',
    limitDaily: '日限额',
    limit7d: '7 天限额',
    limitWeekly: '周限额',
    limitMonthly: '月限额',
    // Detail rows
    remainingQuota: '剩余额度',
    expiresAt: '过期时间',
    todayExpires: '(今日到期)',
    daysLeft: '({days} 天)',
    usedQuota: '已用额度',
    resetNow: '即将重置',
    subscriptionType: '订阅类型',
    billingType: '计费方式',
    subscriptionExpires: '订阅到期',
    // Usage stat cells
    todayRequests: '今日请求',
    todayInputTokens: '今日输入',
    todayOutputTokens: '今日输出',
    todayTokens: '今日 Tokens',
    todayCacheCreation: '今日缓存创建',
    todayCacheRead: '今日缓存读取',
    todayCost: '今日费用',
    rpmTpm: 'RPM / TPM',
    totalRequests: '累计请求',
    totalInputTokens: '累计输入',
    totalOutputTokens: '累计输出',
    totalTokensLabel: '累计 Tokens',
    totalCacheCreation: '累计缓存创建',
    totalCacheRead: '累计缓存读取',
    totalCost: '累计费用',
    avgDuration: '平均耗时',
    // Messages
    enterApiKey: '请输入 API Key',
    querySuccess: '查询成功',
    queryFailed: '查询失败',
    queryFailedRetry: '查询失败，请稍后重试',
    noDailyUsage: '暂无按日用量数据',
  },

  // Setup Wizard
  setup: {
    title: 'Sub2API 安装向导',
    description: '配置您的 Sub2API 实例',
    database: {
      title: '数据库配置',
      description: '连接到您的 PostgreSQL 数据库',
      host: '主机',
      port: '端口',
      username: '用户名',
      password: '密码',
      databaseName: '数据库名称',
      sslMode: 'SSL 模式',
      passwordPlaceholder: '密码',
      ssl: {
        disable: '禁用',
        require: '要求',
        verifyCa: '验证 CA',
        verifyFull: '完全验证'
      }
    },
    redis: {
      title: 'Redis 配置',
      description: '连接到您的 Redis 服务器',
      host: '主机',
      port: '端口',
      username: '用户名（可选）',
      password: '密码（可选）',
      database: '数据库',
      usernamePlaceholder: '默认用户留空',
      passwordPlaceholder: '密码',
      enableTls: '启用 TLS',
      enableTlsHint: '连接 Redis 时使用 TLS（公共 CA 证书）'
    },
    admin: {
      title: '管理员账户',
      description: '创建您的管理员账户',
      email: '邮箱',
      password: '密码',
      confirmPassword: '确认密码',
      passwordPlaceholder: '至少 8 个字符',
      confirmPasswordPlaceholder: '确认密码',
      passwordMismatch: '密码不匹配'
    },
    ready: {
      title: '准备安装',
      description: '检查您的配置并完成安装',
      database: '数据库',
      redis: 'Redis',
      adminEmail: '管理员邮箱'
    },
    status: {
      testing: '测试中...',
      success: '连接成功',
      testConnection: '测试连接',
      installing: '安装中...',
      completeInstallation: '完成安装',
      completed: '安装完成！',
      redirecting: '正在跳转到登录页面...',
      restarting: '服务正在重启，请稍候...',
      timeout: '服务重启时间超出预期，请手动刷新页面。'
    }
  },

  // Common
}
