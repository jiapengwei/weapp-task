const app = getApp()

Page({
  data: {
    city: '正在定位...',
    switchItem: 0, //默认选择‘正在热映’
    //‘正在热映’数据
    movieList0: [],
    movieIds0: [],
    //‘即将上映’数据
    mostExpectedList: [],
    movieList1: [],
    movieIds1: [],
    loadComplete0: false, //‘正在上映’数据是否加载到最后一条    
    loadComplete1: false, // 即将开始
    loadComplete2: false //水平滚动加载的数据是否加载完毕
  },

  onLoad() {
    this.initPage()
    this.loadData()
  },

  initPage() {
    //https://www.jianshu.com/p/aaf65625fc9d   解释的很好
    if (app.globalData.userLocation) {
      this.setData({
        city: app.globalData.selectCity ? app.globalData.selectCity.cityName : '定位失败'
      })
    } else {
      app.userLocationReadyCallback = () => {
        this.setData({
          city: app.globalData.selectCity ? app.globalData.selectCity.cityName : '定位失败'
        })
      }
    }
  },

  onShow() {
    if (app.globalData.selectCity) {
      this.setData({
        city: app.globalData.selectCity.cityName
      })
    }
  },

  //上拉触底刷新
  onReachBottom() {
    // 会从this.data给左边名字相同的变量赋值
    const {
      switchItem,
      movieList0,
      movieIds0,
      movieList1,
      movieIds1,
      loadComplete0,
      loadComplete1
    } = this.data
    if (this.data.switchItem === 0) {
      this.loadMore(movieList0, movieIds0, loadComplete0, 0)
    } else {
      this.loadMore(movieList1, movieIds1, loadComplete1, 1)
    }
  },

  //第一次加载页面时请求‘正在热映的数据’
  loadData() {
    let that = this
    wx.showLoading({
      title: '正在加载...'
    })

    app.fetch(app.config.URI, '/task/list', {})
    .then(res => {
      wx.hideLoading()
      console.log(res);
    })
    .catch(res => {
      wx.hideLoading()
    });

    wx.request({
      url: 'https://m.maoyan.com/ajax/movieOnInfoList?token=',
      success(res) {
        const movieList0 = that.formatImgUrl(res.data.movieList)
        wx.hideLoading()
        that.setData({
          movieIds0: res.data.movieIds,
          movieList0
        })
        if (res.data.movieList.length >= res.data.movieIds.length) {
          that.setData({
            // 表示所有的数据都已经获取完成！
            loadComplete0: true
          })
        }
      }
    })
  },

  //切换swtch
  selectItem(e) {
    const item = e.currentTarget.dataset.item
    this.setData({
      switchItem: item
    })
    if (item === 1 && !this.data.mostExpectedList.length) {
      wx.showLoading({
        title: '正在加载...'
      })
      const that = this
      wx.request({
        url: 'https://m.maoyan.com/ajax/mostExpected?limit=10&offset=0&token=',
        success(res) {
          wx.hideLoading()
          that.setData({
            mostExpectedList: that.formatImgUrl(res.data.coming, true)
          })
        }
      })
      wx.request({
        url: 'https://m.maoyan.com/ajax/comingList?token=&limit=10',
        success(res) {
          wx.hideLoading()
          that.setData({
            movieIds1: res.data.movieIds,
            movieList1: that.formatImgUrl(res.data.coming)
          })
        }
      })
    }
  },

  //上拉触底刷新的加载函数
  loadMore(list, ids, complete, item) {
    const that = this
    if (complete) {
      return
    }
    const length = list.length
    if (length + 10 >= ids.length) {
      this.setData({
        [`loadComplete${item}`]: true
      })
    }
    let query = ids.slice(length, length + 10).join('%2C')
    const url = `https://m.maoyan.com/ajax/moreComingList?token=&movieIds=${query}`
    wx.request({
      url,
      success(res) {
        const arr = list.concat(that.formatImgUrl(res.data.coming))
        that.setData({
          [`movieList${item}`]: arr,
        })
      }
    })
  },

  //滚动到最右边时的事件处理函数
  lower() {
    const {
      mostExpectedList,
      loadComplete2
    } = this.data
    const length = mostExpectedList.length
    const that = this
    if (loadComplete2) {
      return
    }
    wx.request({
      url: `https://m.maoyan.com/ajax/mostExpected?limit=10&offset=${length}&token=`,
      success(res) {
        that.setData({
          mostExpectedList: mostExpectedList.concat(that.formatImgUrl(res.data.coming, true)),
          loadComplete2: !res.data.paging.hasMore || !res.data.coming.length //当返回的数组长度为0时也认为数据请求完毕
        })
      }
    })
  },

  //处理图片url
  formatImgUrl(arr, cutTitle = false) {
    //小程序不能在{{}}调用函数，所以我们只能在获取API的数据时处理，而不能在wx:for的每一项中处理
    if (!Array.isArray(arr)) {
      return
    }
    let newArr = []
    arr.forEach(item => {
      let title = item.comingTitle
      if (cutTitle) {
        title = item.comingTitle.split(' ')[0]
      }
      let imgUrl = item.img.replace('w.h', '128.180')
      newArr.push({ ...item,
        comingTitle: title,
        img: imgUrl
      })
    })
    return newArr
  },

  //转发
  onShareAppMessage(res) {
    return {
      title: '快来看看附近的电影院',
      path: 'pages/tabBar/movie/movie'
    }
  }
})