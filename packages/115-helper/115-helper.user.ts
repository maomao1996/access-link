/*!
// ==UserScript==
// @name          115小助手
// @namespace     https://github.com/maomao1996/tampermonkey-scripts
// @version       1.0.1
// @description   顶部链接任务入口还原、SHA1 快速查重（新页面打开）、SHA1 自动查重、删除空文件夹、一键搜（快捷搜索）、SHA1 查重列表支持选中第一个元素和悬浮菜单展示、搜索列表支持悬浮菜单展示
// @icon      	  https://115.com/favicon.ico
// @author        maomao1996
// @include       *://115.com/*
// @grant         GM_registerMenuCommand
// @grant         GM_addStyle
// @grant         GM_openInTab
// @require       https://greasyfork.org/scripts/398240-gm-config-zh-cn/code/G_zh-CN.js
// @run-at        document-end
// ==/UserScript==
*/

;(() => {
  'use strict'

  // 过滤非 iframe 和 iframe 套娃场景
  if (window.self === window.top || typeof TOP === 'undefined') {
    return
  }

  /**
   * 脚本内部全局变量
   */
  const { search } = top.location
  const { MinMessage } = top.Core

  /**
   * 脚本设置相关
   */
  const GMConfigOptions = {
    id: 'Helper_Cfg',
    title: '115 小助手',
    css: '#Helper_Cfg .config_var textarea{width: 310px; height: 50px;} #Helper_Cfg .inline {padding-bottom:0px;}#Helper_Cfg .config_var {margin-left: 20px;margin-right: 20px;} #Helper_Cfg input[type="checkbox"] {margin-left: 0px;vertical-align: top;} #Helper_Cfg input[type="text"] {width: 53px;} #Helper_Cfg {background-color: lightblue;} #Helper_Cfg .reset_holder {float: left; position: relative; bottom: -1.2em;}',
    frameStyle: {
      height: '560px',
      width: '420px',
      zIndex: '13145201996'
    },
    fields: {
      addTaskBtn: {
        section: ['', '网盘顶部菜单相关设置'],
        label: '网盘顶部菜单增加链接任务按钮',
        labelPos: 'right',
        type: 'checkbox',
        default: true
      },
      'autoSha1.addBtn': {
        section: ['', '网盘路径栏相关设置'],
        label: '网盘路径栏增加SHA1自动查重按钮',
        labelPos: 'right',
        type: 'checkbox',
        default: true,
        line: 'start'
      },
      'autoSha1.maxCount': {
        label: '每次最多打开的标签页数量',
        type: 'int',
        min: 1,
        max: 50,
        default: '20',
        line: 'end'
      },
      addDeleteEmptyBtn: {
        label: '网盘路径栏增加删除空文件夹按钮',
        labelPos: 'right',
        type: 'checkbox',
        default: true
      },
      addFolderRepeatBtn: {
        label: '网盘路径栏增加单文件夹查重按钮',
        labelPos: 'right',
        type: 'checkbox',
        default: true
      },
      addSha1Btn: {
        section: ['', '网盘列表悬浮菜单相关设置'],
        label: '悬浮菜单增加SHA1查重按钮',
        labelPos: 'right',
        type: 'checkbox',
        default: true
      },
      // 一键搜相关（快捷搜索）
      'quickSearch.addBtn': {
        label: '悬浮菜单增加一键搜按钮',
        labelPos: 'right',
        type: 'checkbox',
        default: true,
        line: 'start'
      },
      'quickSearch.edit': {
        label: '打开编辑弹窗再搜索',
        labelPos: 'right',
        type: 'checkbox',
        default: false
      },
      'quickSearch.isAll': {
        label: '默认搜索全部',
        labelPos: 'right',
        type: 'checkbox',
        default: false,
        line: 'end'
      },
      'sha1Repeat.addCheckbox': {
        section: ['', 'SHA1 查重列表模块(重复文件列表)'],
        label: '增加第一个文件选中按钮',
        labelPos: 'right',
        type: 'checkbox',
        default: true
      },
      'sha1Repeat.addMenu': {
        label: '列表增加悬浮菜单',
        labelPos: 'right',
        type: 'checkbox',
        default: true
      },
      'sha1Repeat.select': {
        label: '打开后默认选中',
        labelPos: 'right',
        type: 'checkbox',
        default: true
      },
      'search.addMenu': {
        section: ['', '网盘搜索列表模块'],
        label: '列表增加悬浮菜单',
        labelPos: 'right',
        type: 'checkbox',
        default: true
      },
      joinGroup: {
        section: ['', '其他'],
        label: '加入 QQ 群',
        labelPos: 'right',
        type: 'button',
        click() {
          GM_openInTab('https://jq.qq.com/?_wv=1027&k=ToOoVmku', {
            active: true
          })
        }
      },
      reminder: {
        label: '温馨提示',
        labelPos: 'right',
        type: 'button',
        click() {
          alert(
            `1. 为保证账号安全 SHA1 自动查重 功能使用了缓存机制（每个页码目录下的文件只会查询一次，如需再次查询请使用具体文件的 SHA1查重 按钮或刷新页面后再使用）
2. 脚本设置保存后将会自动刷新页面
3. 脚本加载有条件限制会造成设置弹窗不居中`
          )
        }
      }
    },
    events: {
      save() {
        location.reload()
        G.close()
      }
    }
  }

  type GetKey = keyof typeof GMConfigOptions['fields']
  interface MGMConfig extends GMConfig {
    get(key: GetKey): any
  }

  const G: MGMConfig = GM_config
  G.init(GMConfigOptions)
  GM_registerMenuCommand('设置', () => G.open())

  /**
   * 工具方法 - url 中是否存在某个字符串
   */
  const urlHasString = (str: string): boolean => search.indexOf(str) > -1

  /**
   * 工具方法 - 观察子元素变化
   */
  const observerChildList = (
    callback: (observer: MutationObserver, MutationRecord) => void,
    selector: JQuery | JQuery.Selector = '#js_data_list'
  ): MutationObserver => {
    const observer = new MutationObserver(([mutation]) => {
      mutation.type === 'childList' && callback(observer, mutation)
    })
    const $selector = typeof selector === 'string' ? $(selector) : selector
    if ($selector.length) {
      observer.observe($selector[0], { childList: true })
    }
    return observer
  }

  const getAidCid = (): any => {
    try {
      var main = top.Ext.CACHE.FileMain
      return main.Setting.GetActive()
    } catch (e) {
      return { cid: 0 }
    }
  }

  /**
   * 样式调整
   */
  const styles = [
    /**
     * 小助手相关样式
     */
    '.mm-quick-operation{margin-left: 12px;padding: 0 6px}',
    '.list-contents .active::before{background: rgba(199, 237, 204, 0.7)!important;}'
  ].join('')
  GM_addStyle(styles)

  /**
   * 在顶部菜单添加链接任务按钮
   */
  const addLinkTaskBtn = (): void => {
    $('#js_top_panel_box .button[menu="upload"]').after(
      '<a href="javascript:;" class="button btn-line btn-upload" menu="offline_task"><i class="icon-operate ifo-linktask"></i><span>链接任务</span><em style="display:none;" class="num-dot"></em></a>'
    )
  }

  /**
   * SHA1 查重
   */
  const handleRepeatSha1 = (
    file_id: string,
    isAll = false
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      !isAll &&
        MinMessage.Show({ text: '正在查找', type: 'load', timeout: 2e5 })
      top.UA$.ajax({
        url: '//webapi.115.com/files/get_repeat_sha',
        data: { file_id },
        xhrFields: { withCredentials: !0 },
        dataType: 'json',
        type: 'GET',
        success({ state, data }) {
          !isAll && MinMessage.Hide()
          if (state && data.length > 1) {
            let sha1RepeatUrl = `//115.com/?tab=sha1_repeat&file_id=${file_id}&mode=wangpan`
            if (G.get('sha1Repeat.select')) {
              sha1RepeatUrl += '&select=1'
            }
            GM_openInTab(sha1RepeatUrl, { active: !isAll })
            resolve(true)
          } else {
            !isAll &&
              MinMessage.Show({
                text: '没有重复文件',
                type: 'war',
                timeout: 2e3
              })
            resolve(false)
          }
        }
      })
    })
  }

  const MENU_MAP = {
    move: `<a href="javascript:;" menu="move"><i class="icon-operate ifo-move" menu="move"></i><span menu="move">移动</span></a>`,
    edit_name: `<a href="javascript:;" menu="edit_name"><i class="icon-operate ifo-rename" menu="edit_name"></i><span menu="edit_name">重命名</span></a>`,
    delete: `<a href="javascript:;" menu="delete" btn="del"><i class="icon-operate ifo-remove" menu="delete"></i><span menu="delete">删除</span></a>`,
    search: `<a href="javascript:;" class="mm-operation" type="search"><span>一键搜</span></a>`,
    sha1: `<a href="javascript:;" class="mm-operation" type="sha1"><span>SHA1查重</span></a>`
  }
  type MenuKey = keyof typeof MENU_MAP
  const CONTROLLED_MENU: MenuKey[] = ['search', 'sha1']
  /**
   * 获取悬浮菜单
   */
  const getFloatMenu = (
    fileType: string,
    menuKeys: MenuKey[] = CONTROLLED_MENU,
    isAddWrap?: boolean
  ): string => {
    const menu = menuKeys.reduce((prev, key) => {
      if (key === 'search' && G.get('quickSearch.addBtn')) {
        prev += MENU_MAP.search
      } else if (key === 'sha1' && G.get('addSha1Btn') && fileType === '1') {
        prev += MENU_MAP.sha1
      } else if (!CONTROLLED_MENU.includes(key)) {
        prev += MENU_MAP[key]
      }
      return prev
    }, '')
    if (isAddWrap) {
      return `<div class="file-opr" rel="menu">${menu}</div>`
    }
    return menu
  }

  /**
   * 悬浮菜单初始化
   */
  const initMenu = (): void => {
    /**
     * 一键搜（快捷搜索）
     */
    const handleQuickSearch = (keyword: string): void => {
      const { aid, cid, name } = getAidCid()

      const openSearch = (value: string) => {
        GM_openInTab(
          `//115.com/?mode=search&submode=wangpan&url=${encodeURIComponent(
            `/?aid=${aid}&cid=${
              G.get('quickSearch.isAll') ? 0 : cid
            }&old_cid=${cid}&old_cid_name=${encodeURIComponent(
              name
            )}&search_value=${encodeURIComponent(
              value
            )}&ct=file&ac=search&is_wl_tpl=1`
          )}`,
          { active: true }
        )
      }

      if (!G.get('quickSearch.edit')) {
        openSearch(keyword)
        return
      }

      const content = $(
        '<div class="dialog-input"><textarea rel="txt"></textarea></div><div class="dialog-action"><a href="javascript:;" class="dgac-confirm" btn="confirm">搜索</a></div>'
      )
      const $input = content.find("[rel='txt']")

      $input.val(keyword)

      const $dialog = new top.Core.DialogBase({
        title: '115 小助手(编辑一键搜)',
        content
      })
      const confirm = () => {
        openSearch(($input.val() as string).trim())
        $dialog.Close()
      }

      $input.on('keydown', function (e) {
        switch (e.keyCode) {
          case 13:
            return confirm()
          case 27:
            return $dialog.Close()
        }
      })
      content.find('[btn="confirm"]').on('click', confirm)
      $dialog.Open()
      $input.focus()
    }

    $(document).on('click', '.mm-operation', function () {
      const type = $(this).attr('type')
      const $li = $(this).parents('li')
      if (!type) {
        return
      }
      switch (type) {
        case 'sha1':
          return handleRepeatSha1($li.attr('file_id'))
        case 'search':
          const ico = $li.attr('ico')
          const title = $li.attr('title')
          return handleQuickSearch(title.replace(`.${ico}`, ''))
      }
    })
  }

  /**
   * 快捷操作增强
   *  - SHA1查重
   *  - 删除空文件夹
   */
  const initQuickOperation = (): void => {
    // 防止重复点击自动查重
    let autoCheckDisabled = false

    // 顶部添加快捷操作按钮
    if (!$('.mm-quick-operation').length) {
      let operations = ''
      if (G.get('autoSha1.addBtn')) {
        operations += `<a href="javascript:;" class="button btn-line mm-quick-operation" type="auto-sha1" title="只查询当前页码目录中的文件"><span>SHA1自动查重</span></a>`
      }
      if (G.get('addDeleteEmptyBtn')) {
        operations += `<a href="javascript:;" class="button btn-line mm-quick-operation" type="delete-empty" title="只删除当前页码目录中的文件夹"><span>删除空文件夹</span></a>`
      }
      if (G.get('addFolderRepeatBtn')) {
        operations += `<a href="javascript:;" class="button btn-line mm-quick-operation" type="folder-sha1" title="只查询并标记当前目录中的重复文件"><span>单文件夹查重</span></a>`
      }
      $('#js_path_add_dir').after(operations)
    }

    observerChildList(() => {
      autoCheckDisabled = false
      if ($('.list-thumb').length > 0) {
        return
      }
      $('li[rel="item"]').each(function () {
        if (!$(this).find('.mm-operation').length) {
          $(this)
            .find('a[menu="public_share"]')
            .after(getFloatMenu($(this).attr('file_type')))
        }
      })
    })

    const handleGetDetail = (aid: string, cid: string): Promise<any> => {
      return new Promise((resolve) => {
        top.Core.DataAccess.Dir.GetDetail(aid, cid, (res) => resolve(res))
      })
    }

    // SHA1 自动查重
    const SHA1_MAP = {}
    const handleAutoCheckSha1 = () => {
      if (autoCheckDisabled) {
        MinMessage.Show({
          text: '已查询过当前页码所有文件，需再次查询请刷新页面',
          type: 'war',
          timeout: 2e3
        })
        return
      }

      const $li = $('li[file_type="1"]')

      if (!$li.length || Object.keys(SHA1_MAP).length === $li.length) {
        MinMessage.Show({
          text: '当前文件夹下没有可查重文件',
          type: 'war',
          timeout: 2e3
        })
        return
      }

      MinMessage.Show({ text: '正在查找', type: 'load', timeout: 2e5 })

      let index = 0
      // 重复数统计
      let repeatCount = 0

      const findRepeat = () => {
        const isMax = repeatCount >= G.get('autoSha1.maxCount')
        const isEnd = index >= $li.length
        if (isEnd || isMax) {
          isEnd && (autoCheckDisabled = true)
          const options = { text: '', type: '', timeout: 2e3 }
          if (repeatCount) {
            options.text = isMax
              ? `已查询到 ${repeatCount} 个重复文件`
              : `已查询完当前分页，共 ${repeatCount} 个重复文件`
            options.type = 'suc'
          } else {
            options.text = '当前分页下没有可查重文件'
            options.type = 'war'
          }
          MinMessage.Show(options)
          return
        }
        const $currentLi = $li.eq(index)
        const fileId = $currentLi.attr('file_id')
        const sha1 = $currentLi.attr('sha1')
        index++
        if (fileId && sha1 && !SHA1_MAP[sha1]) {
          SHA1_MAP[sha1] = 1
          return handleRepeatSha1(fileId, true).then((flag) => {
            if (flag) {
              $currentLi.addClass('active')
              repeatCount++
            }
            return findRepeat()
          })
        }
        return findRepeat()
      }

      findRepeat()
    }

    // 删除空文件夹
    const handleDeleteEmptyFolder = () => {
      const $li = $('li[file_type="0"]')
      if (!$li.length) {
        MinMessage.Show({
          text: '当前文件目录下没有文件夹',
          type: 'war',
          timeout: 2e3
        })
        return
      }

      MinMessage.Show({ text: '正在查找', type: 'load', timeout: 2e4 })
      const files = []
      $li.each(function () {
        files.push(
          handleGetDetail($(this).attr('area_id'), $(this).attr('cate_id'))
        )
      })
      Promise.all(files).then(function (result) {
        let emptyFolderCount = 0
        result.forEach((item, index) => {
          const $current = $li.eq(index)
          if (item.size === '0B') {
            emptyFolderCount++
            $current.find('[menu="file_check_one"]').trigger('click')
          }
          $current.find('.file-size span').text(item.size)
        })

        if (emptyFolderCount === 0) {
          MinMessage.Show({
            text: '当前文件目录下没有空文件夹',
            type: 'war',
            timeout: 2e3
          })
        } else {
          MinMessage.Hide()
          setTimeout(() => {
            $('li[menu="delete"]:visible').trigger('click')
          }, 200)
        }
      })
    }

    // 单文件夹查重
    const handleFolderCheckSha1 = () => {
      const $loadAllFile = $('[menu="load_all_file"]:visible')
      const isMore = !!$loadAllFile.length

      const checkSha1 = () => {
        const SHA1_MAP = {}

        const $li = $('li[file_type="1"]')

        if (!$li.length) {
          MinMessage.Show({
            text: '当前文件夹下没有可查重文件',
            type: 'war',
            timeout: 2e3
          })
          return
        }
        // 重复数统计
        let repeatCount = 0

        $li.each(function () {
          const sha1 = $(this).attr('sha1')
          if (!SHA1_MAP[sha1]) {
            SHA1_MAP[sha1] = 1
          } else {
            repeatCount++
            $(this).addClass('active')
          }
        })

        const options = { text: '', type: '', timeout: 2e3 }
        if (repeatCount) {
          options.text = `当前文件夹下共 ${repeatCount} 个重复文件`
          options.type = 'suc'
        } else {
          options.text = '当前文件夹下没有重复文件'
          options.type = 'war'
        }
        MinMessage.Show(options)
      }

      if (isMore) {
        observerChildList((_, { addedNodes }) => {
          addedNodes.length && checkSha1()
        }, '#js_data_list .list-contents > ul')

        // 加载全部文件
        $loadAllFile.trigger('click')
      } else {
        checkSha1()
      }
    }

    // 路径栏快捷操作
    $(document).on('click', '.mm-quick-operation', function () {
      const type = $(this).attr('type')
      if (!type) {
        return
      }
      switch (type) {
        // SHA1 自动查重
        case 'auto-sha1':
          return handleAutoCheckSha1()
        // 删除空文件夹
        case 'delete-empty':
          return handleDeleteEmptyFolder()
        // 单文件夹查重
        case 'folder-sha1':
          return handleFolderCheckSha1()
      }
    })
  }

  /**
   * SHA1 查重列表（支持选中第一个元素）
   */
  const initRepeatSha1List = (): void => {
    const $list = $('#js-list')
    observerChildList(() => {
      // 支持选中第一个元素
      if (G.get('sha1Repeat.addCheckbox')) {
        const $first = $list.find('li:first-child')
        if (!$first.attr('item')) {
          $first.attr('item', 'file').find('i.file-type').removeProp('style')
          $first.children('.file-name-wrap').prepend('<b class="checkbox"></b>')
        }
        if (G.get('sha1Repeat.select')) {
          $first.trigger('click')
        }
      }

      // 添加悬浮菜单
      if (G.get('sha1Repeat.addMenu')) {
        $('li[rel="item"]').each(function () {
          const that = $(this)
          if (!that.attr('shared')) {
            that.attr('shared', '0')
          }
          if (!that.find('.file-opr').length) {
            that.append(
              getFloatMenu(
                that.attr('file_type'),
                ['move', 'edit_name', 'delete'],
                true
              )
            )
          }
        })
      }
    }, $list)

    // 点击菜单调用对应 115 方法
    $list.on('click', '.file-opr a', function (event) {
      event.stopPropagation()
      top.Core.FileMenu.DoEvent(
        [$(this).parents('li')],
        $(this).attr('menu'),
        checkRepaatApi.load
      )
    })
  }

  // 初始化
  $(() => {
    initMenu()
    // 网盘列表模块
    if (urlHasString('cid=')) {
      // 添加链接任务入口
      G.get('addTaskBtn') && addLinkTaskBtn()
      initQuickOperation()
    }
    // SHA1 查重列表模块
    else if (urlHasString('tab=sha1_repeat')) {
      initRepeatSha1List()
    }
    // 网盘搜索模块
    else if (urlHasString('mode=search') && G.get('search.addMenu')) {
      observerChildList(() => {
        $('li[rel="item"]').each(function () {
          if (!$(this).find('.mm-operation').length) {
            $(this).append(
              getFloatMenu(
                $(this).attr('file_type'),
                ['move', 'edit_name', 'delete', 'search', 'sha1'],
                true
              )
            )
          }
        })
      })
    }
  })
})()
