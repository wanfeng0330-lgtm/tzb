(function () {
  var isWechat = /MicroMessenger/i.test(navigator.userAgent);
  var app = document.getElementById('app');
  var block = document.getElementById('wechat-block');

  if (!isWechat) {
    app.style.display = 'none';
    block.style.display = 'flex';
    document.getElementById('copyLink').addEventListener('click', function () {
      var url = window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          showToast('链接已复制，请在微信中打开');
        });
      } else {
        var input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('链接已复制，请在微信中打开');
      }
    });
    return;
  }

  var state = {
    isDarkMode: localStorage.getItem('isDarkMode') === 'true',
    collections: JSON.parse(localStorage.getItem('collections') || '[]'),
    checkInDays: parseInt(localStorage.getItem('checkInDays') || '0'),
    lastCheckInDate: localStorage.getItem('lastCheckInDate') || '',
    totalCheckIns: parseInt(localStorage.getItem('totalCheckIns') || '0'),
    currentPage: 'home',
    qaState: { searchText: '', currentCategory: 'all', showResult: false, currentAnswer: null, isAILoading: false, isAIAnswer: false },
    cardState: { searchText: '', currentCategory: 'all' },
    guideDetailState: { guide: null, currentStep: 0 },
    quizState: { currentQuestion: 0, score: 0, answered: false, finished: false }
  };

  function saveState() {
    localStorage.setItem('collections', JSON.stringify(state.collections));
    localStorage.setItem('checkInDays', state.checkInDays);
    localStorage.setItem('lastCheckInDate', state.lastCheckInDate);
    localStorage.setItem('totalCheckIns', state.totalCheckIns);
    localStorage.setItem('isDarkMode', state.isDarkMode);
  }

  function getTodayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function getYesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function checkIn() {
    var today = getTodayStr();
    if (state.lastCheckInDate === today) return false;
    var yesterday = getYesterdayStr();
    if (state.lastCheckInDate === yesterday) {
      state.checkInDays += 1;
    } else {
      state.checkInDays = 1;
    }
    state.lastCheckInDate = today;
    state.totalCheckIns += 1;
    saveState();
    return true;
  }

  function toggleCollection(cardId) {
    var idx = state.collections.indexOf(cardId);
    if (idx > -1) {
      state.collections.splice(idx, 1);
      saveState();
      return false;
    } else {
      state.collections.push(cardId);
      saveState();
      return true;
    }
  }

  function isCollected(cardId) {
    return state.collections.indexOf(cardId) > -1;
  }

  function toggleDarkMode() {
    state.isDarkMode = !state.isDarkMode;
    saveState();
    applyDarkMode();
  }

  function applyDarkMode() {
    if (state.isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    var icons = document.querySelectorAll('#darkIconHome, #darkIconProfile');
    icons.forEach(function (el) {
      el.textContent = state.isDarkMode ? '☀️' : '🌙';
    });
    var text = document.getElementById('darkTextProfile');
    if (text) text.textContent = state.isDarkMode ? '日间' : '夜间';
  }

  function showToast(msg) {
    var toast = document.getElementById('toast');
    var text = document.getElementById('toastText');
    text.textContent = msg;
    toast.style.display = 'block';
    setTimeout(function () { toast.style.display = 'none'; }, 2000);
  }

  function showModal(title, content, buttons) {
    var overlay = document.getElementById('modalOverlay');
    var titleEl = document.getElementById('modalTitle');
    var contentEl = document.getElementById('modalContent');
    var actionsEl = document.getElementById('modalActions');
    titleEl.textContent = title;
    contentEl.textContent = content;
    actionsEl.innerHTML = '';
    buttons.forEach(function (btn) {
      var el = document.createElement('div');
      el.className = 'modal-btn ' + (btn.className || 'modal-btn-confirm');
      el.textContent = btn.text;
      el.addEventListener('click', function () {
        overlay.style.display = 'none';
        if (btn.onClick) btn.onClick();
      });
      actionsEl.appendChild(el);
    });
    overlay.style.display = 'flex';
  }

  function navigateTo(pageName, data) {
    var pages = document.querySelectorAll('.page');
    pages.forEach(function (p) { p.classList.remove('active'); });
    var target = document.getElementById('page-' + pageName);
    if (target) {
      target.classList.add('active');
      target.scrollTop = 0;
    }
    state.currentPage = pageName;

    var tabBar = document.getElementById('tabBar');
    var tabPages = ['home', 'cards', 'guide', 'profile'];
    if (tabPages.indexOf(pageName) > -1) {
      tabBar.style.display = 'flex';
      document.querySelectorAll('.tab-item').forEach(function (t) { t.classList.remove('active'); });
      var tabItem = document.querySelector('.tab-item[data-tab="' + pageName + '"]');
      if (tabItem) tabItem.classList.add('active');
    } else {
      tabBar.style.display = 'none';
    }

    if (pageName === 'home') renderHome();
    if (pageName === 'qa') renderQA(data);
    if (pageName === 'cards') renderCards();
    if (pageName === 'card-detail') renderCardDetail(data);
    if (pageName === 'guide') renderGuide();
    if (pageName === 'guide-detail') renderGuideDetail(data);
    if (pageName === 'daily') renderDaily();
    if (pageName === 'profile') renderProfile();
    if (pageName === 'collection') renderCollection();
    if (pageName === 'quiz') renderQuiz();
    if (pageName === 'sos') renderSOS();
  }

  function renderHome() {
    var emergencyList = document.getElementById('emergencyList');
    emergencyList.innerHTML = guideData.map(function (g) {
      return '<div class="emergency-item" data-guide="' + g.id + '">' +
        '<div class="emergency-icon" style="background: ' + g.color + '20;">' +
        '<span>' + g.icon + '</span></div>' +
        '<span class="emergency-name">' + g.title + '</span></div>';
    }).join('');

    emergencyList.addEventListener('click', function (e) {
      var item = e.target.closest('.emergency-item');
      if (item) navigateTo('guide-detail', item.dataset.guide);
    });

    var qaList = document.getElementById('quickQAList');
    qaList.innerHTML = quickQuestions.slice(0, 6).map(function (q) {
      return '<div class="quick-qa-item" data-qaid="' + q.qaId + '">' +
        '<span class="qa-tag ' + q.tagClass + '">' + q.category + '</span>' +
        '<span class="qa-text">' + q.text + '</span>' +
        '<span class="qa-arrow">›</span></div>';
    }).join('');

    qaList.addEventListener('click', function (e) {
      var item = e.target.closest('.quick-qa-item');
      if (item) navigateTo('qa', { qaId: item.dataset.qaid });
    });

    var daily = getDailyContent();
    var dailyCard = document.getElementById('dailyCard');
    var hasCheckedIn = state.lastCheckInDate === getTodayStr();
    dailyCard.innerHTML =
      '<div class="daily-top"><span class="daily-icon">' + daily.icon + '</span>' +
      '<div class="daily-info"><span class="daily-title">' + daily.title + '</span>' +
      '<span class="daily-category">' + daily.category + '</span></div></div>' +
      '<span class="daily-content">' + daily.content + '</span>' +
      '<div class="daily-footer"><span class="daily-source">来源：' + daily.source + '</span>' +
      '<div class="daily-actions"><span class="daily-action" id="homeShareDaily">📤 分享</span>' +
      '<span class="daily-action" id="homeCheckIn">' + (hasCheckedIn ? '✅ 已打卡' : '📝 打卡') + '</span></div></div>';

    var checkInBtn = document.getElementById('homeCheckIn');
    if (checkInBtn) {
      checkInBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (state.lastCheckInDate === getTodayStr()) {
          showToast('今日已打卡');
          return;
        }
        var success = checkIn();
        if (success) {
          var days = state.checkInDays;
          if (days % 7 === 0) {
            showModal('🎉 打卡成功', '连续打卡' + days + '天！获得"应急科普达人"电子证书！', [{ text: '知道了', className: 'modal-btn-confirm' }]);
          } else {
            showToast('打卡成功！连续' + days + '天');
          }
          renderHome();
        }
      });
    }

    var shareBtn = document.getElementById('homeShareDaily');
    if (shareBtn) {
      shareBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (navigator.share) {
          navigator.share({ title: '智能应急速查 - ' + daily.title, text: daily.content, url: window.location.href });
        } else {
          copyToClipboard(daily.title + '\n' + daily.content);
          showToast('内容已复制，可分享给好友');
        }
      });
    }
  }

  function renderQA(data) {
    var qa = state.qaState;
    var tabsEl = document.getElementById('qaCategoryTabs');
    tabsEl.innerHTML = '<span class="tab-item-inline active" data-cat="all">全部</span>' +
      qaCategories.map(function (c) {
        return '<span class="tab-item-inline" data-cat="' + c.name + '">' + c.icon + ' ' + c.name + '</span>';
      }).join('');

    var quickEl = document.getElementById('qaQuickQuestions');
    var filtered = qa.currentCategory === 'all' ? quickQuestions : quickQuestions.filter(function (q) { return q.category === qa.currentCategory; });
    quickEl.innerHTML = '<div class="section-label">💬 常见问题快速选单</div>' +
      '<div class="question-grid">' + filtered.map(function (q) {
        return '<div class="question-chip" data-qaid="' + q.qaId + '">' +
          '<span class="chip-tag ' + q.tagClass + '">' + q.category + '</span>' +
          '<span class="chip-text">' + q.text + '</span></div>';
      }).join('') + '</div>';

    tabsEl.addEventListener('click', function (e) {
      var tab = e.target.closest('.tab-item-inline');
      if (tab) {
        tabsEl.querySelectorAll('.tab-item-inline').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        qa.currentCategory = tab.dataset.cat;
        renderQA(null);
      }
    });

    quickEl.addEventListener('click', function (e) {
      var chip = e.target.closest('.question-chip');
      if (chip) loadQAAnswer(chip.dataset.qaid);
    });

    var searchInput = document.getElementById('qaSearchInput');
    var searchBtn = document.getElementById('qaSearchBtn');
    searchInput.value = qa.searchText;

    searchInput.addEventListener('input', function () {
      qa.searchText = this.value;
      searchBtn.style.display = this.value ? 'block' : 'none';
      if (!this.value) {
        qa.showResult = false;
        document.getElementById('qaSearchResults').style.display = 'none';
        document.getElementById('qaAnswerArea').style.display = 'none';
        tabsEl.style.display = '';
        quickEl.style.display = '';
        return;
      }
      var results = searchQA(this.value);
      tabsEl.style.display = 'none';
      quickEl.style.display = 'none';
      var resultsEl = document.getElementById('qaSearchResults');
      if (results.length > 0) {
        resultsEl.innerHTML = '<div class="section-label">🔍 搜索结果</div><div class="result-list">' +
          results.map(function (r, i) {
            return '<div class="result-item" data-idx="' + i + '"><div class="result-cat"><span class="qa-tag ' + r.tagClass + '">' + r.category + '</span></div>' +
              '<span class="result-question">' + r.question + '</span><span class="result-arrow">›</span></div>';
          }).join('') + '</div>';
        resultsEl.style.display = '';
        resultsEl.addEventListener('click', function (e) {
          var item = e.target.closest('.result-item');
          if (item) {
            var idx = parseInt(item.dataset.idx);
            loadQAAnswer(results[idx].id);
          }
        });
      } else {
        resultsEl.innerHTML = '<div class="section-label">🔍 搜索结果</div><div class="no-result"><span class="no-result-icon">🤖</span><span class="no-result-text">本地未找到，点击搜索将调用智能解答</span></div>';
        resultsEl.style.display = '';
      }
      document.getElementById('qaAnswerArea').style.display = 'none';
    });

    searchBtn.addEventListener('click', function () {
      if (qa.searchText) {
        var results = searchQA(qa.searchText);
        if (results.length > 0) {
          loadQAAnswer(results[0].id);
        } else {
          callAIForAnswer(qa.searchText);
        }
      }
    });

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && qa.searchText) {
        var results = searchQA(qa.searchText);
        if (results.length > 0) {
          loadQAAnswer(results[0].id);
        } else {
          callAIForAnswer(qa.searchText);
        }
      }
    });

    if (data && data.qaId) {
      loadQAAnswer(data.qaId);
    }

    if (qa.showResult && qa.currentAnswer) {
      showQAAnswer();
    }
  }

  function searchQA(text) {
    var keyword = text.toLowerCase();
    return qaData.filter(function (q) {
      return q.question.toLowerCase().indexOf(keyword) > -1 ||
        q.keywords.some(function (k) { return k.indexOf(keyword) > -1 || keyword.indexOf(k) > -1; });
    }).map(function (q) {
      return { id: q.id, category: q.category, question: q.question, tagClass: getTagClass(q.category) };
    });
  }

  function loadQAAnswer(qaId) {
    var answer = qaData.find(function (q) { return q.id === qaId; });
    if (!answer) return;
    var related = qaData.filter(function (q) { return q.category === answer.category && q.id !== answer.id; }).slice(0, 3);
    state.qaState.showResult = true;
    state.qaState.isAIAnswer = false;
    state.qaState.isAILoading = false;
    state.qaState.searchText = answer.question;
    state.qaState.currentAnswer = {
      id: answer.id, category: answer.category, tagClass: getTagClass(answer.category),
      question: answer.question, steps: answer.answer.steps, warning: answer.answer.warning, source: answer.answer.source
    };
    state.qaState.relatedQuestions = related;
    showQAAnswer();
  }

  function showQAAnswer() {
    var qa = state.qaState;
    var ans = qa.currentAnswer;
    if (!ans) return;

    document.getElementById('qaSearchInput').value = ans.question;
    document.getElementById('qaSearchBtn').style.display = ans.question ? 'block' : 'none';
    document.getElementById('qaCategoryTabs').style.display = 'none';
    document.getElementById('qaQuickQuestions').style.display = 'none';
    document.getElementById('qaSearchResults').style.display = 'none';

    var area = document.getElementById('qaAnswerArea');
    var loadingHtml = qa.isAILoading ? '<div class="ai-loading"><div class="loading-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div><span class="loading-text">正在思考中...</span></div>' : '';
    var stepsHtml = !qa.isAILoading ? '<div class="answer-steps">' + ans.steps.map(function (s, i) {
      return '<div class="step-item"><div class="step-number">' + (i + 1) + '</div><div class="step-content"><span class="step-desc">' + s + '</span></div></div>';
    }).join('') + '</div>' +
      (ans.warning ? '<div class="warning-box"><span class="label">⚠️ 关键提醒</span><span class="text">' + ans.warning + '</span></div>' : '') +
      (ans.source ? '<div class="source-label">来源：' + ans.source + '</div>' : '') : '';

    var actionsHtml = !qa.isAILoading ? '<div class="answer-actions">' +
      '<div class="action-btn" id="qaShareBtn">📤 分享</div>' +
      '<div class="action-btn" id="qaCopyBtn">📋 复制</div>' +
      '<div class="action-btn" id="qaResetBtn">🔄 再问一个</div></div>' : '';

    var relatedHtml = '';
    if (qa.relatedQuestions && qa.relatedQuestions.length > 0 && !qa.isAILoading) {
      relatedHtml = '<div class="related-questions"><div class="section-label">相关问题</div><div class="related-list">' +
        qa.relatedQuestions.map(function (r) {
          return '<div class="related-item" data-qaid="' + r.id + '">' + r.question + '</div>';
        }).join('') + '</div></div>';
    }

    area.innerHTML = '<div class="answer-card"><div class="answer-header">' +
      '<span class="answer-icon">🤖</span><span class="answer-label">' + (qa.isAIAnswer ? '智能实时生成' : '智能解答') + '</span>' +
      (qa.isAIAnswer ? '<span class="ai-badge">✨ 实时</span>' : '') +
      '</div><div class="answer-question"><span class="qa-tag ' + ans.tagClass + '">' + ans.category + '</span>' +
      '<span class="question-text">' + ans.question + '</span></div>' +
      loadingHtml + stepsHtml + '</div>' + actionsHtml + relatedHtml;

    area.style.display = '';

    var shareBtn = document.getElementById('qaShareBtn');
    if (shareBtn) shareBtn.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ title: '智能应急速查 - ' + ans.question, text: ans.steps.join('\n'), url: window.location.href });
      } else {
        copyToClipboard(ans.question + '\n\n' + ans.steps.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n') + '\n\n⚠️ ' + ans.warning);
        showToast('已复制到剪贴板');
      }
    });

    var copyBtn = document.getElementById('qaCopyBtn');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      copyToClipboard(ans.question + '\n\n' + ans.steps.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n') + '\n\n⚠️ ' + ans.warning + '\n\n来源：' + ans.source);
      showToast('已复制到剪贴板');
    });

    var resetBtn = document.getElementById('qaResetBtn');
    if (resetBtn) resetBtn.addEventListener('click', function () {
      state.qaState = { searchText: '', currentCategory: 'all', showResult: false, currentAnswer: null, isAILoading: false, isAIAnswer: false };
      renderQA(null);
    });

    area.querySelectorAll('.related-item').forEach(function (el) {
      el.addEventListener('click', function () { loadQAAnswer(el.dataset.qaid); });
    });
  }

  function callAIForAnswer(question) {
    var qa = state.qaState;
    qa.showResult = true;
    qa.isAILoading = true;
    qa.isAIAnswer = true;
    qa.currentAnswer = { question: question, category: '智能解答', tagClass: 'tag-medical', steps: [], warning: '', source: '' };
    qa.relatedQuestions = [];
    showQAAnswer();

    var API_BASE = 'https://api.siliconflow.cn/v1/chat/completions';
    var API_KEY = 'sk-rmhfzxzasgtoqxscrvpicttvhnjlpszompsqjrxvaemimtdd';
    var SYSTEM_PROMPT = '你是"智能应急速查"的智能应急问答助手。回答必须步骤化，包含关键提醒和信息来源。格式：【步骤】\n1. xxx\n【关键提醒】\nxxx\n【来源】\nxxx';

    fetch(API_BASE, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'Qwen/Qwen3-32B',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: question }],
        temperature: 0.3, max_tokens: 1024, stream: false
      })
    }).then(function (r) { return r.json(); }).then(function (data) {
      var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '';
      var parsed = parseAIResponse(content);
      qa.isAILoading = false;
      qa.currentAnswer.steps = parsed.steps;
      qa.currentAnswer.warning = parsed.warning;
      qa.currentAnswer.source = parsed.source;
      showQAAnswer();
    }).catch(function () {
      qa.isAILoading = false;
      qa.currentAnswer.steps = ['服务暂时不可用，请稍后重试'];
      qa.currentAnswer.warning = '如遇紧急情况，请立即拨打120/119/110求助';
      qa.currentAnswer.source = '网络错误';
      showQAAnswer();
    });
  }

  function parseAIResponse(content) {
    var steps = [], warning = '', source = '';
    var stepsMatch = content.match(/【步骤】([\s\S]*?)(?=【关键提醒】|【来源】|$)/);
    if (stepsMatch) {
      stepsMatch[1].trim().split('\n').forEach(function (line) {
        line = line.trim();
        if (line && /^\d+[.、．)\s]/.test(line)) {
          line = line.replace(/^\d+[.、．)\s]+/, '').trim();
          if (line) steps.push(line);
        }
      });
    }
    var warningMatch = content.match(/【关键提醒】([\s\S]*?)(?=【来源】|$)/);
    if (warningMatch) warning = warningMatch[1].trim();
    var sourceMatch = content.match(/【来源】([\s\S]*?)$/);
    if (sourceMatch) source = sourceMatch[1].trim();
    if (!steps.length) steps = ['请参考专业应急指南或拨打急救电话获取帮助'];
    if (!warning) warning = '紧急情况请立即拨打120/119/110求助';
    if (!source) source = '生成内容，仅供参考';
    return { steps: steps, warning: warning, source: source };
  }

  function renderCards() {
    var cs = state.cardState;
    var grid = document.getElementById('cardCategoryGrid');
    grid.innerHTML = '<div class="category-item ' + (cs.currentCategory === 'all' ? 'active' : '') + '" data-cat="all">' +
      '<div class="cat-icon" style="background: linear-gradient(135deg, #6366F1, #818CF8);">📚</div>' +
      '<span class="cat-name">全部</span><span class="cat-count">' + cardData.length + '</span></div>' +
      cardCategories.map(function (c) {
        return '<div class="category-item ' + (cs.currentCategory === c.name ? 'active' : '') + '" data-cat="' + c.name + '">' +
          '<div class="cat-icon" style="background: linear-gradient(135deg, ' + c.color1 + ', ' + c.color2 + ');">' + c.icon + '</div>' +
          '<span class="cat-name">' + c.name + '</span><span class="cat-count">' + c.count + '</span></div>';
      }).join('');

    grid.addEventListener('click', function (e) {
      var item = e.target.closest('.category-item');
      if (item) {
        cs.currentCategory = item.dataset.cat;
        renderCards();
      }
    });

    var filtered = cardData.filter(function (c) {
      var catMatch = cs.currentCategory === 'all' || c.category === cs.currentCategory;
      var textMatch = !cs.searchText || c.title.toLowerCase().indexOf(cs.searchText.toLowerCase()) > -1 ||
        c.steps.some(function (s) { return s.toLowerCase().indexOf(cs.searchText.toLowerCase()) > -1; });
      return catMatch && textMatch;
    });

    var list = document.getElementById('cardList');
    var empty = document.getElementById('cardEmpty');
    if (filtered.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'flex';
    } else {
      empty.style.display = 'none';
      list.innerHTML = filtered.map(function (c) {
        var collected = isCollected(c.id);
        return '<div class="knowledge-card" data-id="' + c.id + '">' +
          '<div class="card-header"><span class="card-icon">' + c.icon + '</span>' +
          '<span class="qa-tag ' + c.categoryTag + '">' + c.category + '</span>' +
          '<span class="card-collect" data-collect="' + c.id + '">' + (collected ? '❤️' : '🤍') + '</span></div>' +
          '<span class="card-title">' + c.title + '</span>' +
          '<div class="card-steps">' + c.steps.map(function (s, i) {
            return '<div class="card-step"><div class="step-dot">' + (i + 1) + '</div><span class="step-text">' + s + '</span></div>';
          }).join('') + '</div>' +
          '<div class="card-reminder"><span class="reminder-icon">⚠️</span><span class="reminder-text">' + c.reminder + '</span></div>' +
          '<div class="card-footer"><span class="card-source">来源：' + c.source + '</span>' +
          '<span class="card-share" data-share="' + c.id + '">📤 分享</span></div></div>';
      }).join('');

      list.addEventListener('click', function (e) {
        var collectEl = e.target.closest('.card-collect');
        if (collectEl) {
          e.stopPropagation();
          var added = toggleCollection(collectEl.dataset.collect);
          showToast(added ? '已收藏' : '已取消收藏');
          renderCards();
          return;
        }
        var shareEl = e.target.closest('.card-share');
        if (shareEl) {
          e.stopPropagation();
          var card = cardData.find(function (c) { return c.id === shareEl.dataset.share; });
          if (card) {
            copyToClipboard(card.title + '\n\n' + card.steps.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n') + '\n\n⚠️ ' + card.reminder);
            showToast('内容已复制，可分享给好友');
          }
          return;
        }
        var cardEl = e.target.closest('.knowledge-card');
        if (cardEl) navigateTo('card-detail', cardEl.dataset.id);
      });
    }

    var searchInput = document.getElementById('cardSearchInput');
    searchInput.value = cs.searchText;
    searchInput.oninput = function () {
      cs.searchText = this.value;
      renderCards();
    };
  }

  function renderCardDetail(cardId) {
    var card = cardData.find(function (c) { return c.id === cardId; });
    if (!card) return;
    var collected = isCollected(card.id);
    var page = document.getElementById('page-card-detail');
    page.innerHTML =
      '<div class="page-top-bar"><span class="back-btn" data-nav="cards">←</span><span class="page-top-title">' + card.title + '</span></div>' +
      '<div class="detail-card"><div class="detail-header"><span class="detail-icon">' + card.icon + '</span>' +
      '<div class="detail-info"><span class="qa-tag ' + card.categoryTag + '">' + card.category + '</span>' +
      '<span class="detail-title">' + card.title + '</span></div></div>' +
      '<div class="detail-steps">' + card.steps.map(function (s, i) {
        return '<div class="step-item"><div class="step-number">' + (i + 1) + '</div><div class="step-content"><span class="step-desc">' + s + '</span></div></div>';
      }).join('') + '</div>' +
      '<div class="warning-box"><span class="label">⚠️ 关键提醒</span><span class="text">' + card.reminder + '</span></div>' +
      '<div class="source-label">来源：' + card.source + '</div></div>' +
      '<div class="action-bar"><div class="action-btn-item collect-btn ' + (collected ? 'collected' : '') + '" id="detailCollectBtn">' +
      (collected ? '❤️ 已收藏' : '🤍 收藏') + '</div>' +
      '<div class="action-btn-item share-btn" id="detailShareBtn">📤 分享给好友</div></div>';

    page.querySelector('.back-btn').addEventListener('click', function () { navigateTo('cards'); });
    document.getElementById('detailCollectBtn').addEventListener('click', function () {
      var added = toggleCollection(card.id);
      showToast(added ? '已收藏' : '已取消收藏');
      renderCardDetail(cardId);
    });
    document.getElementById('detailShareBtn').addEventListener('click', function () {
      copyToClipboard(card.title + '\n\n' + card.steps.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n') + '\n\n⚠️ ' + card.reminder);
      showToast('内容已复制，可分享给好友');
    });
  }

  function renderGuide() {
    var list = document.getElementById('guideList');
    list.innerHTML = guideData.map(function (g) {
      return '<div class="guide-card" data-guide="' + g.id + '">' +
        '<div class="guide-left" style="border-left-color: ' + g.color + ';">' +
        '<div class="guide-icon-wrap" style="background: ' + g.color + '15;"><span class="guide-icon">' + g.icon + '</span></div>' +
        '<div class="guide-info"><span class="guide-title">' + g.title + '</span>' +
        '<span class="guide-steps-count">' + g.steps.length + '步操作</span></div></div>' +
        '<div class="guide-right"><span class="guide-arrow">›</span></div></div>';
    }).join('');

    list.addEventListener('click', function (e) {
      var card = e.target.closest('.guide-card');
      if (card) navigateTo('guide-detail', card.dataset.guide);
    });
  }

  function renderGuideDetail(guideId) {
    var guide = guideData.find(function (g) { return g.id === guideId; });
    if (!guide) return;
    state.guideDetailState = { guide: guide, currentStep: 0 };
    renderGuideStep();
  }

  function renderGuideStep() {
    var gs = state.guideDetailState;
    var guide = gs.guide;
    var step = gs.currentStep;
    var total = guide.steps.length;
    var stepData = guide.steps[step];
    var page = document.getElementById('page-guide-detail');

    page.innerHTML =
      '<div class="guide-header" style="background: linear-gradient(135deg, ' + guide.color + ', ' + guide.color + 'CC);">' +
      '<span class="guide-icon">' + guide.icon + '</span><span class="guide-title">' + guide.title + '</span>' +
      '<span class="guide-subtitle">共' + total + '步 · 按步骤操作</span></div>' +
      '<div class="step-progress"><div class="progress-bar"><div class="progress-fill" style="width: ' + ((step + 1) / total * 100) + '%; background: ' + guide.color + ';"></div></div>' +
      '<span class="progress-text">' + (step + 1) + ' / ' + total + '</span></div>' +
      '<div class="step-display"><div class="step-card"><div class="step-badge" style="background: ' + guide.color + ';">' +
      '<span class="step-num">第' + (step + 1) + '步</span></div>' +
      '<span class="step-title">' + stepData.title + '</span>' +
      '<div class="step-desc-box"><span class="step-desc-icon">✅</span><span class="step-desc">' + stepData.desc + '</span></div>' +
      '<div class="step-mistake-box"><span class="mistake-label">❌ 易错点提醒</span><span class="mistake-text">' + stepData.mistake + '</span></div></div></div>' +
      '<div class="step-nav"><div class="nav-btn ' + (step === 0 ? 'disabled' : '') + '" id="prevStepBtn">← 上一步</div>' +
      '<div class="step-dots">' + guide.steps.map(function (_, i) {
        return '<div class="dot" style="background: ' + (i === step ? guide.color : '#E5E7EB') + ';"></div>';
      }).join('') + '</div>' +
      '<div class="nav-btn ' + (step === total - 1 ? 'disabled' : '') + '" id="nextStepBtn">下一步 →</div></div>' +
      (step === total - 1 ? '<div class="complete-area"><div class="complete-btn" id="completeBtn" style="background: ' + guide.color + ';">✅ 已完成所有步骤</div></div>' : '') +
      (guide.emergency ? '<div class="emergency-action"><div class="emergency-call-btn" id="callEmergencyGuide" style="background: ' + guide.color + ';">📞 紧急求助：拨打' + guide.phone + '</div></div>' : '') +
      '<div class="source-info">来源：' + guide.source + '</div>';

    var prevBtn = document.getElementById('prevStepBtn');
    var nextBtn = document.getElementById('nextStepBtn');
    if (prevBtn && step > 0) prevBtn.addEventListener('click', function () { gs.currentStep--; renderGuideStep(); });
    if (nextBtn && step < total - 1) nextBtn.addEventListener('click', function () { gs.currentStep++; renderGuideStep(); });
    var completeBtn = document.getElementById('completeBtn');
    if (completeBtn) completeBtn.addEventListener('click', function () {
      showModal('🎉 操作完成', '您已完成所有步骤！如情况紧急，请立即拨打急救电话。', [
        { text: '知道了', className: 'modal-btn-confirm' }
      ]);
    });
    var callBtn = document.getElementById('callEmergencyGuide');
    if (callBtn) callBtn.addEventListener('click', function () {
      window.location.href = 'tel:' + guide.phone;
    });
  }

  function renderDaily() {
    var today = getDailyContent();
    var allDaily = dailyData;
    var todayIndex = allDaily.indexOf(today);
    var history = [];
    for (var i = 0; i < 7; i++) {
      var idx = (todayIndex - i - 1 + allDaily.length) % allDaily.length;
      history.push(allDaily[idx]);
    }

    var hasCheckedIn = state.lastCheckInDate === getTodayStr();
    document.getElementById('checkInDays').textContent = '连续打卡 ' + state.checkInDays + ' 天';
    document.getElementById('totalCheckIns').textContent = '累计 ' + state.totalCheckIns + ' 天';

    var checkInBtn = document.getElementById('checkInBtn');
    checkInBtn.innerHTML = hasCheckedIn ? '<span>✅ 已打卡</span>' : '<span>📝 打卡</span>';
    if (hasCheckedIn) checkInBtn.classList.add('checked');
    else checkInBtn.classList.remove('checked');

    checkInBtn.onclick = function () {
      if (hasCheckedIn) { showToast('今日已打卡'); return; }
      var success = checkIn();
      if (success) {
        var days = state.checkInDays;
        if (days >= 7 && days % 7 === 0) {
          showModal('🎉 恭喜获得证书', '连续打卡' + days + '天，获得"应急科普达人"电子证书！', [{ text: '知道了', className: 'modal-btn-confirm' }]);
        } else {
          showToast('打卡成功！');
        }
        renderDaily();
      }
    };

    var progressEl = document.getElementById('checkinProgress');
    var progressHtml = '';
    for (var j = 0; j < 7; j++) {
      var done = j < (state.checkInDays % 7) || (state.checkInDays % 7 === 0 && state.checkInDays > 0);
      progressHtml += '<div class="progress-item"><div class="progress-dot ' + (done ? 'done' : '') + '">' + (done ? '✓' : '') + '</div><span class="progress-label">第' + (j + 1) + '天</span></div>';
    }
    progressHtml += '<div class="progress-item"><div class="progress-dot cert">🏅</div><span class="progress-label">证书</span></div>';
    progressEl.innerHTML = progressHtml;

    document.getElementById('todayCard').innerHTML =
      '<div class="today-top"><span class="today-icon">' + today.icon + '</span>' +
      '<div class="today-info"><span class="today-title">' + today.title + '</span>' +
      '<span class="today-cat">' + today.category + '</span></div></div>' +
      '<span class="today-content">' + today.content + '</span>' +
      '<div class="today-footer"><span class="today-source">来源：' + today.source + '</span>' +
      '<div class="today-actions"><span class="action-text" id="dailyShareBtn">📤 分享</span>' +
      '<span class="action-text" id="dailyCopyBtn">💾 复制</span></div></div>';

    document.getElementById('dailyShareBtn').addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ title: '智能应急速查 - ' + today.title, text: today.content, url: window.location.href });
      } else {
        copyToClipboard(today.title + '\n' + today.content);
        showToast('内容已复制，可分享给好友');
      }
    });
    document.getElementById('dailyCopyBtn').addEventListener('click', function () {
      copyToClipboard(today.title + '\n' + today.content);
      showToast('已复制到剪贴板');
    });

    renderDailyQuiz();

    var historyEl = document.getElementById('historyList');
    historyEl.innerHTML = history.map(function (h) {
      return '<div class="history-item"><div class="history-left"><span class="history-icon">' + h.icon + '</span>' +
        '<div class="history-info"><span class="history-title">' + h.title + '</span>' +
        '<span class="history-cat">' + h.category + '</span></div></div>' +
        '<span class="history-arrow">›</span></div>';
    }).join('');

    var gameBtn = document.getElementById('openGameBtn');
    if (gameBtn) {
      gameBtn.addEventListener('click', function () {
        window.open('https://7.u.h5mc.com/c/vcqg/g1az/index.html', '_blank');
      });
    }

    var gameQR = document.getElementById('gameQR');
    if (gameQR) {
      gameQR.addEventListener('click', function () {
        var imgUrl = 'assets/game-qr.jpg';
        var a = document.createElement('a');
        a.href = imgUrl;
        a.download = '应急知识小游戏二维码.jpg';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    }
  }

  function renderDailyQuiz() {
    var randomIdx = Math.floor(Math.random() * quizData.length);
    var q = quizData[randomIdx];
    var quizCard = document.getElementById('quizCard');
    quizCard.innerHTML =
      '<div class="quiz-question">' + q.question + '</div>' +
      '<div class="quiz-options">' + q.options.map(function (opt, i) {
        return '<div class="quiz-option" data-idx="' + i + '">' + String.fromCharCode(65 + i) + '. ' + opt + '</div>';
      }).join('') + '</div>';

    quizCard.querySelectorAll('.quiz-option').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = parseInt(el.dataset.idx);
        var correct = idx === q.correct;
        quizCard.querySelectorAll('.quiz-option').forEach(function (o, i) {
          o.classList.add('disabled');
          if (i === q.correct) o.classList.add('correct');
          if (i === idx && !correct) o.classList.add('wrong');
        });
        var resultDiv = document.createElement('div');
        resultDiv.className = 'quiz-result ' + (correct ? 'correct-result' : 'wrong-result');
        resultDiv.textContent = (correct ? '✅ 回答正确！' : '❌ 回答错误！') + q.explanation;
        quizCard.appendChild(resultDiv);

        var nextDiv = document.createElement('div');
        nextDiv.className = 'quiz-next-btn';
        nextDiv.textContent = '下一题 →';
        nextDiv.addEventListener('click', function () { renderDailyQuiz(); });
        quizCard.appendChild(nextDiv);
      });
    });
  }

  function renderProfile() {
    var days = state.checkInDays;
    var total = state.totalCheckIns;
    var level = Math.floor(total / 7) + 1;
    document.getElementById('userLevel').textContent = 'Lv.' + level;
    document.getElementById('statCheckInDays').textContent = days;
    document.getElementById('statTotalCheckIns').textContent = total;
    document.getElementById('statCollectionCount').textContent = state.collections.length;
  }

  function renderCollection() {
    var searchInput = document.getElementById('collectionSearchInput');
    var searchText = searchInput.value.toLowerCase();
    var cards = cardData.filter(function (c) { return state.collections.indexOf(c.id) > -1; });
    var filtered = cards.filter(function (c) { return !searchText || c.title.toLowerCase().indexOf(searchText) > -1; });

    var listEl = document.getElementById('collectionList');
    var emptyEl = document.getElementById('collectionEmpty');
    var emptyText = document.getElementById('collectionEmptyText');

    if (filtered.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'flex';
      emptyText.textContent = searchText ? '未找到匹配的收藏内容' : '暂无收藏内容';
    } else {
      emptyEl.style.display = 'none';
      listEl.innerHTML = filtered.map(function (c) {
        return '<div class="collection-card" data-id="' + c.id + '">' +
          '<div class="card-header"><span class="card-icon">' + c.icon + '</span>' +
          '<span class="qa-tag ' + c.categoryTag + '">' + c.category + '</span>' +
          '<span class="card-remove" data-remove="' + c.id + '">❤️</span></div>' +
          '<span class="card-title">' + c.title + '</span>' +
          '<div class="card-steps-preview"><span class="step-preview">' + c.steps[0] + '</span></div></div>';
      }).join('');

      listEl.querySelectorAll('.collection-card').forEach(function (el) {
        el.addEventListener('click', function (e) {
          if (e.target.closest('.card-remove')) {
            e.stopPropagation();
            var id = e.target.closest('.card-remove').dataset.remove;
            showModal('取消收藏', '确定取消收藏该知识卡片吗？', [
              { text: '取消', className: 'modal-btn-cancel' },
              { text: '确定', className: 'modal-btn-danger', onClick: function () { toggleCollection(id); showToast('已取消收藏'); renderCollection(); } }
            ]);
            return;
          }
          navigateTo('card-detail', el.dataset.id);
        });
      });
    }

    searchInput.oninput = function () { renderCollection(); };
  }

  function renderQuiz() {
    var qs = state.quizState;
    if (qs.finished) {
      var total = quizData.length;
      var score = qs.score;
      var msg = score >= total * 0.8 ? '🎉 你是应急知识达人！' : score >= total * 0.6 ? '👍 不错，继续加油！' : '📚 还需多学习哦！';
      document.getElementById('quizContainer').innerHTML =
        '<div class="quiz-score"><div class="quiz-score-num">' + score + '/' + total + '</div>' +
        '<div class="quiz-score-label">正确率 ' + Math.round(score / total * 100) + '%</div>' +
        '<div class="quiz-score-msg">' + msg + '</div></div>' +
        '<div class="quiz-next-btn" id="quizRestartBtn">重新开始</div>';
      document.getElementById('quizRestartBtn').addEventListener('click', function () {
        state.quizState = { currentQuestion: 0, score: 0, answered: false, finished: false };
        renderQuiz();
      });
      return;
    }

    var q = quizData[qs.currentQuestion];
    var total = quizData.length;
    document.getElementById('quizContainer').innerHTML =
      '<div class="quiz-progress-bar"><div class="progress-bar"><div class="progress-fill" style="width: ' + ((qs.currentQuestion + 1) / total * 100) + '%; background: #2563EB;"></div></div>' +
      '<span class="quiz-progress-text">' + (qs.currentQuestion + 1) + '/' + total + '</span></div>' +
      '<div class="quiz-card"><div class="quiz-question">' + q.question + '</div>' +
      '<div class="quiz-options">' + q.options.map(function (opt, i) {
        return '<div class="quiz-option" data-idx="' + i + '">' + String.fromCharCode(65 + i) + '. ' + opt + '</div>';
      }).join('') + '</div></div>';

    document.querySelectorAll('.quiz-option').forEach(function (el) {
      el.addEventListener('click', function () {
        if (qs.answered) return;
        qs.answered = true;
        var idx = parseInt(el.dataset.idx);
        var correct = idx === q.correct;
        if (correct) qs.score++;
        document.querySelectorAll('.quiz-option').forEach(function (o, i) {
          o.classList.add('disabled');
          if (i === q.correct) o.classList.add('correct');
          if (i === idx && !correct) o.classList.add('wrong');
        });
        var resultDiv = document.createElement('div');
        resultDiv.className = 'quiz-result ' + (correct ? 'correct-result' : 'wrong-result');
        resultDiv.textContent = (correct ? '✅ 正确！' : '❌ 错误！') + q.explanation;
        el.closest('.quiz-card').appendChild(resultDiv);

        var nextDiv = document.createElement('div');
        nextDiv.className = 'quiz-next-btn';
        nextDiv.textContent = qs.currentQuestion < total - 1 ? '下一题 →' : '查看结果';
        nextDiv.addEventListener('click', function () {
          if (qs.currentQuestion < total - 1) {
            qs.currentQuestion++;
            qs.answered = false;
            renderQuiz();
          } else {
            qs.finished = true;
            renderQuiz();
          }
        });
        el.closest('.quiz-card').appendChild(nextDiv);
      });
    });
  }

  function renderSOS() {
    var page = document.getElementById('page-sos');
    page.innerHTML =
      '<div class="page-top-bar"><span class="back-btn" data-nav="home">←</span><span class="page-top-title">🆘 紧急求救</span></div>' +
      '<div class="sos-content">' +
      '<div class="sos-main-btn" id="sosCall120"><span class="sos-main-icon">📞</span><span class="sos-main-text">拨打 120 急救</span></div>' +
      '<div class="sos-phone-list">' +
      '<div class="sos-phone-item" data-phone="120"><div class="sos-phone-icon" style="background: #DC2626;">120</div><div class="sos-phone-info"><span class="sos-phone-name">医疗急救</span><span class="sos-phone-desc">突发疾病、外伤、中毒等</span></div><span class="sos-phone-number">120</span></div>' +
      '<div class="sos-phone-item" data-phone="119"><div class="sos-phone-icon" style="background: #F97316;">119</div><div class="sos-phone-info"><span class="sos-phone-name">消防救援</span><span class="sos-phone-desc">火灾、地震、被困等</span></div><span class="sos-phone-number">119</span></div>' +
      '<div class="sos-phone-item" data-phone="110"><div class="sos-phone-icon" style="background: #2563EB;">110</div><div class="sos-phone-info"><span class="sos-phone-name">报警电话</span><span class="sos-phone-desc">治安事件、交通事故等</span></div><span class="sos-phone-number">110</span></div>' +
      '<div class="sos-phone-item" data-phone="122"><div class="sos-phone-icon" style="background: #059669;">122</div><div class="sos-phone-info"><span class="sos-phone-name">交通事故</span><span class="sos-phone-desc">道路交通事故报警</span></div><span class="sos-phone-number">122</span></div>' +
      '</div>' +
      '<div class="sos-location-section"><div class="sos-location-title">📍 发送位置给紧急联系人</div>' +
      '<div class="sos-location-text">在紧急情况下，向家人或朋友发送您的实时位置，方便救援人员快速定位。</div>' +
      '<div class="sos-location-btn" id="sosShareLocation">📍 获取并分享我的位置</div></div>' +
      '<div class="sos-tips"><div class="sos-tips-title">💡 紧急求救提示</div>' +
      '<div class="sos-tips-item">保持冷静，清晰说明事发地点和情况</div>' +
      '<div class="sos-tips-item">如无法说话，可发送短信至12110报警</div>' +
      '<div class="sos-tips-item">夜间求救可用手机闪光灯发出SOS信号（三短三长三短）</div>' +
      '<div class="sos-tips-item">被困时敲击管道或墙壁发出有节奏的求救信号</div>' +
      '<div class="sos-tips-item">在微信中可使用"位置共享"功能让朋友实时追踪</div></div></div>';

    page.querySelector('.back-btn').addEventListener('click', function () { navigateTo('home'); });

    document.getElementById('sosCall120').addEventListener('click', function () {
      window.location.href = 'tel:120';
    });

    page.querySelectorAll('.sos-phone-item').forEach(function (el) {
      el.addEventListener('click', function () {
        window.location.href = 'tel:' + el.dataset.phone;
      });
    });

    document.getElementById('sosShareLocation').addEventListener('click', function () {
      if (navigator.geolocation) {
        showToast('正在获取位置...');
        navigator.geolocation.getCurrentPosition(function (pos) {
          var lat = pos.coords.latitude;
          var lng = pos.coords.longitude;
          var url = 'https://uri.amap.com/marker?position=' + lng + ',' + lat + '&name=我的位置';
          copyToClipboard('我的紧急位置：' + url);
          showToast('位置链接已复制，请发送给紧急联系人');
        }, function () {
          showToast('获取位置失败，请手动发送位置');
        });
      } else {
        showToast('浏览器不支持定位，请在微信中发送位置');
      }
    });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      var input = document.createElement('textarea');
      input.value = text;
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  }

  function init() {
    applyDarkMode();

    document.getElementById('toggleDarkHome').addEventListener('click', toggleDarkMode);
    document.getElementById('toggleDarkProfile').addEventListener('click', toggleDarkMode);

    document.getElementById('goToQA').addEventListener('click', function () { navigateTo('qa'); });

    document.querySelectorAll('.nav-item[data-nav]').forEach(function (el) {
      el.addEventListener('click', function () { navigateTo(el.dataset.nav); });
    });

    document.querySelectorAll('.section-more[data-nav]').forEach(function (el) {
      el.addEventListener('click', function () { navigateTo(el.dataset.nav); });
    });

    document.querySelectorAll('.menu-item[data-nav]').forEach(function (el) {
      el.addEventListener('click', function () { navigateTo(el.dataset.nav); });
    });

    document.querySelectorAll('.tab-item[data-tab]').forEach(function (el) {
      el.addEventListener('click', function () { navigateTo(el.dataset.tab); });
    });

    document.querySelectorAll('.hotline-item[data-phone]').forEach(function (el) {
      el.addEventListener('click', function () {
        showModal('紧急呼叫', '确定拨打 ' + el.dataset.phone + ' 吗？', [
          { text: '取消', className: 'modal-btn-cancel' },
          { text: '拨打', className: 'modal-btn-danger', onClick: function () { window.location.href = 'tel:' + el.dataset.phone; } }
        ]);
      });
    });

    document.querySelectorAll('.hotline-card[data-phone]').forEach(function (el) {
      el.addEventListener('click', function () {
        window.location.href = 'tel:' + el.dataset.phone;
      });
    });

    document.querySelectorAll('.hotline-btn[data-phone]').forEach(function (el) {
      el.addEventListener('click', function () {
        window.location.href = 'tel:' + el.dataset.phone;
      });
    });

    document.getElementById('sosBtn').addEventListener('click', function () { navigateTo('sos'); });

    document.getElementById('callEmergencyBtn').addEventListener('click', function () {
      showModal('一键求助', '请选择紧急电话', [
        { text: '120 医疗急救', className: 'modal-btn-danger', onClick: function () { window.location.href = 'tel:120'; } },
        { text: '119 消防救援', className: 'modal-btn-danger', onClick: function () { window.location.href = 'tel:119'; } },
        { text: '110 报警电话', className: 'modal-btn-danger', onClick: function () { window.location.href = 'tel:110'; } }
      ]);
    });

    document.getElementById('showAbout').addEventListener('click', function () {
      showModal('关于我们', '智能应急速查·秒懂应急\n\n聚焦"便捷查询+智能解答+高效传播"核心需求，实现全民应急科普知识的精准化、便捷化传播，提升公众应急处理能力。\n\n所有科普内容均引用官方应急指南，确保权威可靠。\n\n访问地址：317330.xyz', [
        { text: '知道了', className: 'modal-btn-confirm' }
      ]);
    });

    document.getElementById('showDisclaimer').addEventListener('click', function () {
      showModal('免责声明', '本应用提供的应急知识仅供参考学习，不构成专业医疗建议。遇到紧急情况请立即拨打120/119/110等专业急救电话，听从专业人员指导。本应用不对因使用本内容造成的任何损失承担责任。', [
        { text: '我已了解', className: 'modal-btn-confirm' }
      ]);
    });

    document.addEventListener('click', function (e) {
      var backBtn = e.target.closest('.back-btn[data-nav]');
      if (backBtn) navigateTo(backBtn.dataset.nav);
    });

    navigateTo('home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
