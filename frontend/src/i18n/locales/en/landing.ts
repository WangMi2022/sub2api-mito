export default {
  batchImageGuide: {
    title: 'Batch Image Generation',
    description: 'Submit multiple prompts in one job and download the generated images when complete'
  },
  // Home Page
  home: {
    mito: {
      heroSubtitle: 'One Key, Leading Chinese AI Models',
      heroDescription: 'Access Kimi, GLM, DeepSeek and MiniMax in one place, with simpler model calls, key management and usage tracking.',
      heroBadge: 'Chinese LLMs · One Gateway',
      terminalLabel: 'Example API call',
      stats: {
        models: 'Model Families',
        key: 'Unified Key',
        failover: 'Smart Routing',
        billing: 'Cost Tracking',
        routingValue: 'Auto',
        billingValue: 'Usage'
      },
      steps: {
        title: 'Three Steps to Your First Call',
        subtitle: 'Create a key, connect a model and track usage in one dashboard',
        connect: {
          title: 'Create a Key',
          desc: 'Sign in and generate an API key, then choose a group with the models and quota you need.'
        },
        call: {
          title: 'Configure Your Client',
          desc: 'Set the gateway API address and key in a compatible SDK, then choose a model to get started.'
        },
        monitor: {
          title: 'Track Usage',
          desc: 'Review request logs, tokens and itemized costs, and manage your quota as needed.'
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
        title: 'Core Features',
        subtitle: 'One key, three layers: access, routing and billing share a single path with no extra hop in between.',
        items: {
          gateway: {
            title: 'Unified access',
            desc: 'One OpenAI-compatible endpoint covers every listed model. Keep your existing SDKs and clients instead of maintaining a key and a code path per vendor.',
            tags: { compatible: 'OpenAI-compatible', key: 'Single key', endpoint: 'One endpoint' }
          },
          routing: {
            title: 'Multi-route dispatch',
            desc: 'Each model sits behind several upstream accounts and is routed by live health. A failing account is swapped out automatically while the conversation stays on one path.',
            tags: { pool: 'Account pool', failover: 'Auto failover', isolation: 'Group isolation' }
          },
          billing: {
            title: 'Usage and billing',
            desc: 'Billed on actual tokens, with multipliers, tiers, cache and time-based rules visible before you call. Daily, weekly and monthly limits can be set independently.',
            tags: { usage: 'Pay per token', quota: 'Quota caps', detail: 'Itemized logs' }
          }
        },
        facts: {
          key: { label: 'Access', value: 'One API key' },
          sdk: { label: 'Protocol', value: 'OpenAI-compatible' },
          route: { label: 'On failure', value: 'Automatic failover' },
          billing: { label: 'Billing basis', value: 'Actual tokens' }
        }
      },
      playground: {
        eyebrow: 'Interactive API Sandbox',
        title: 'Interactive API Sandbox',
        subtitle: 'Simulate a standard OpenAI SDK call and see routing, latency and token cost. Nothing is sent upstream and no quota is consumed.',
        endpointLabel: 'Request endpoint',
        modelLabel: 'Target model',
        tokensInput: 'Input tokens',
        tokensOutput: 'Output tokens',
        run: 'Run simulated request',
        running: 'Routing request...',
        placeholder: 'Preparing the simulated response...',
        status: 'STATUS',
        statePreview: 'PREVIEW',
        stateBusy: 'ROUTING',
        stateOk: '200 OK',
        estimate: 'Estimate',
        rate: 'Effective rate',
        rateSuffix: 'x',
        empty: 'The model price list is unavailable right now. It will retry automatically.'
      },
      workbench: {
        title: 'Gateway Workbench',
        subtitle: 'Polymorphic policy routing, live cost modeling and a high-availability dispatch sandbox in one control plane.',
        enter: 'Open Workbench',
        consoleTitle: 'YUYU GATEWAY CONSOLE · CONTROL PLANE',
        ready: 'GATEWAY ON',
        standby: 'STANDBY POOLS: {count}',
        activeModel: 'ACTIVE MODEL',
        packetDelay: 'PACKET DELAY',
        topology: 'LIVE GATEWAY TOPOLOGY',
        policyTitle: 'ADVANCED ROUTING POLICIES',
        channelTitle: 'ACTIVE DISPATCH CHANNELS',
        policies: {
          auto: 'Adaptive',
          lowTtft: 'Low TTFT',
          failover: 'Failover'
        },
        policyDesc: {
          auto: 'Adaptive routing: orchestrates traffic dynamically based on node telemetry, TTFT and warm pool availability.',
          lowTtft: 'Low TTFT acceleration: prioritizes immediate edge nodes to minimize first-byte response time.',
          failover: 'Active-active failover: maintains multi-pool hot standbys and reroutes transparently within 20ms.'
        },
        volume: 'MONTHLY VOLUME PROJECTION',
        official: 'OFFICIAL',
        officialPrice: 'Vendor list price',
        ourPrice: 'Charged here',
        monthlySaved: 'PROJECTED MONTHLY SAVINGS',
        monthUnit: 'mo',
        prompt: 'SIMULATION PROMPT',
        promptPlaceholder: 'Enter a prompt to simulate',
        temperature: 'TEMPERATURE',
        endpoint: 'ENDPOINT',
        runDispatch: 'RUN ROUTE DISPATCH',
        dispatching: 'DISPATCHING PACKETS...',
        outputPlaceholder: 'Run a simulation to inspect the highlighted JSON stream',
        trace: 'ROUTE TRACE LOG',
        live: 'LIVE',
        traceReady: 'Gateway smart control plane is live and active',
        tracePools: 'Physical routing backup pools synchronized (3 warm pools)',
        traceEdge: 'Uplink edge channel connected · HKG-01 Edge active',
        traceTopology: 'Handshake path established -> Client Edge -> YUYU-Router -> {route}',
        traceUpstream: 'Connecting upstream {model} · {id} (Ping: {ping}ms)',
        traceSuccess: 'Channel dispatched · cost ratio {saved}',
        savedRatio: 'COST RATIO',
        parity: 'AT PARITY',
        parityNote: 'Billed at the vendor reference price, no markup'
      },
      cta: {
        title: 'Connect Your Next Idea',
        description: 'Manage keys, models and usage in one place. Keep your focus on creating.',
        button: 'Get Started'
      }
    },
    viewOnGithub: 'View on GitHub',
    viewDocs: 'View Documentation',
    docs: 'Docs',
    switchToLight: 'Switch to Light Mode',
    switchToDark: 'Switch to Dark Mode',
    dashboard: 'Dashboard',
    login: 'Login',
    getStarted: 'Get Started',
    goToDashboard: 'Go to Dashboard',
    // User-focused value proposition
    heroSubtitle: 'One Key, All AI Models',
    heroDescription: 'No need to manage multiple subscriptions. Access Claude, GPT, Gemini and more with a single API key',
    tags: {
      subscriptionToApi: 'Subscription to API',
      stickySession: 'Session Persistence',
      realtimeBilling: 'Pay As You Go'
    },
    // Pain points section
    painPoints: {
      title: 'Sound Familiar?',
      items: {
        expensive: {
          title: 'High Subscription Costs',
          desc: 'Paying for multiple AI subscriptions that add up every month'
        },
        complex: {
          title: 'Account Chaos',
          desc: 'Managing scattered accounts and API keys across different platforms'
        },
        unstable: {
          title: 'Service Interruptions',
          desc: 'Single accounts hitting rate limits and disrupting your workflow'
        },
        noControl: {
          title: 'No Usage Control',
          desc: "Can't track where your money goes or limit team member usage"
        }
      }
    },
    // Solutions section
    solutions: {
      title: 'We Solve These Problems',
      subtitle: 'Three simple steps to stress-free AI access'
    },
    features: {
      unifiedGateway: 'One-Click Access',
      unifiedGatewayDesc: 'Get a single API key to call all connected AI models. No separate applications needed.',
      multiAccount: 'Always Reliable',
      multiAccountDesc: 'Smart routing across multiple upstream accounts with automatic failover. Say goodbye to errors.',
      balanceQuota: 'Pay What You Use',
      balanceQuotaDesc: 'Usage-based billing with quota limits. Full visibility into team consumption.'
    },
    // Comparison section
    comparison: {
      title: 'Why Choose Us?',
      headers: {
        feature: 'Comparison',
        official: 'Official Subscriptions',
        us: 'Our Platform'
      },
      items: {
        pricing: {
          feature: 'Pricing',
          official: 'Fixed monthly fee, pay even if unused',
          us: 'Pay only for what you use'
        },
        models: {
          feature: 'Model Selection',
          official: 'Single provider only',
          us: 'Switch between models freely'
        },
        management: {
          feature: 'Account Management',
          official: 'Manage each service separately',
          us: 'Unified key, one dashboard'
        },
        stability: {
          feature: 'Stability',
          official: 'Single account rate limits',
          us: 'Multi-account pool, auto-failover'
        },
        control: {
          feature: 'Usage Control',
          official: 'Not available',
          us: 'Quotas & detailed analytics'
        }
      }
    },
    providers: {
      title: 'Supported AI Models',
      description: 'One API, Multiple Choices',
      supported: 'Supported',
      soon: 'Soon',
      claude: 'Claude',
      gemini: 'Gemini',
      antigravity: 'Antigravity',
      more: 'More'
    },
    // CTA section
    cta: {
      title: 'Ready to Get Started?',
      description: 'Sign up now and get free trial credits to experience seamless AI access',
      button: 'Sign Up Free'
    },
    footer: {
      allRightsReserved: 'All rights reserved.'
    }
  },

  // Key Usage Query Page
  keyUsage: {
    title: 'API Key Usage',
    subtitle: 'Enter your API Key to view real-time spending and usage status',
    placeholder: 'sk-ant-mirror-xxxxxxxxxxxx',
    query: 'Query',
    querying: 'Querying...',
    privacyNote: 'Your Key is processed locally in the browser and will not be stored',
    dateRange: 'Date Range:',
    dateRangeToday: 'Today',
    dateRange7d: '7 Days',
    dateRange30d: '30 Days',
    dateRange90d: '90 Days',
    dateRangeCustom: 'Custom',
    apply: 'Apply',
    used: 'Used',
    detailInfo: 'Detail Information',
    tokenStats: 'Token Statistics',
    dailyDetail: 'Daily Detail',
    modelStats: 'Model Usage Statistics',
    // Table headers
    date: 'Date',
    model: 'Model',
    requests: 'Requests',
    inputTokens: 'Input Tokens',
    outputTokens: 'Output Tokens',
    cacheCreationTokens: 'Cache Creation',
    cacheReadTokens: 'Cache Read',
    cacheWriteTokens: 'Cache Write',
    totalTokens: 'Total Tokens',
    cost: 'Cost',
    // Status
    quotaMode: 'Key Quota Mode',
    walletBalance: 'Wallet Balance',
    // Ring card titles
    totalQuota: 'Total Quota',
    limit5h: '5-Hour Limit',
    limitDaily: 'Daily Limit',
    limit7d: '7-Day Limit',
    limitWeekly: 'Weekly Limit',
    limitMonthly: 'Monthly Limit',
    // Detail rows
    remainingQuota: 'Remaining Quota',
    expiresAt: 'Expires At',
    todayExpires: '(expires today)',
    daysLeft: '({days} days)',
    usedQuota: 'Used Quota',
    resetNow: 'Resetting soon',
    subscriptionType: 'Subscription Type',
    billingType: 'Billing Type',
    subscriptionExpires: 'Subscription Expires',
    // Usage stat cells
    todayRequests: 'Today Requests',
    todayInputTokens: 'Today Input',
    todayOutputTokens: 'Today Output',
    todayTokens: 'Today Tokens',
    todayCacheCreation: 'Today Cache Creation',
    todayCacheRead: 'Today Cache Read',
    todayCost: 'Today Cost',
    rpmTpm: 'RPM / TPM',
    totalRequests: 'Total Requests',
    totalInputTokens: 'Total Input',
    totalOutputTokens: 'Total Output',
    totalTokensLabel: 'Total Tokens',
    totalCacheCreation: 'Total Cache Creation',
    totalCacheRead: 'Total Cache Read',
    totalCost: 'Total Cost',
    avgDuration: 'Avg Duration',
    // Messages
    enterApiKey: 'Please enter an API Key',
    querySuccess: 'Query successful',
    queryFailed: 'Query failed',
    queryFailedRetry: 'Query failed, please try again later',
    noDailyUsage: 'No daily usage data',
  },

  // Setup Wizard
  setup: {
    title: 'Sub2API Setup',
    description: 'Configure your Sub2API instance',
    database: {
      title: 'Database Configuration',
      description: 'Connect to your PostgreSQL database',
      host: 'Host',
      port: 'Port',
      username: 'Username',
      password: 'Password',
      databaseName: 'Database Name',
      sslMode: 'SSL Mode',
      passwordPlaceholder: 'Password',
      ssl: {
        disable: 'Disable',
        require: 'Require',
        verifyCa: 'Verify CA',
        verifyFull: 'Verify Full'
      }
    },
    redis: {
      title: 'Redis Configuration',
      description: 'Connect to your Redis server',
      host: 'Host',
      port: 'Port',
      username: 'Username (optional)',
      password: 'Password (optional)',
      database: 'Database',
      usernamePlaceholder: 'Leave empty for default user',
      passwordPlaceholder: 'Password',
      enableTls: 'Enable TLS',
      enableTlsHint: 'Use TLS when connecting to Redis (public CA certs)'
    },
    admin: {
      title: 'Admin Account',
      description: 'Create your administrator account',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      passwordPlaceholder: 'Min 8 characters',
      confirmPasswordPlaceholder: 'Confirm password',
      passwordMismatch: 'Passwords do not match'
    },
    ready: {
      title: 'Ready to Install',
      description: 'Review your configuration and complete setup',
      database: 'Database',
      redis: 'Redis',
      adminEmail: 'Admin Email'
    },
    status: {
      testing: 'Testing...',
      success: 'Connection Successful',
      testConnection: 'Test Connection',
      installing: 'Installing...',
      completeInstallation: 'Complete Installation',
      completed: 'Installation completed!',
      redirecting: 'Redirecting to login page...',
      restarting: 'Service is restarting, please wait...',
      timeout: 'Service restart is taking longer than expected. Please refresh the page manually.'
    }
  },

  // Common
}
