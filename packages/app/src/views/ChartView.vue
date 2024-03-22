<template>
  <div>
    <h1>{{Title}}</h1>
    <div class="batches-container">
      <div id="echartsBox"></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import useBatches from "@/composables/useBatches";
import useContext from "@/composables/useContext";
import * as echarts from 'echarts';
import useChartsData from "@/composables/useChartsData";
const { t } = useI18n();

const context = useContext();
const route = useRoute();
const searchParams = computed(() => route.query);
const { getData,data } = useChartsData();
const Title = route.query.type === 'TVL'? 'zkLink Nova Daily TVL Chart': 'zkLink Nova Unique Addresses Chart'
const format = (str:string,type:string,isNow:boolean) => {
  const date = new Date(str)
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var dayOfWeek = days[date.getDay()];
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var day = date.getDate();
  var month = months[date.getMonth()];
  var year = date.getFullYear();
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var seconds = date.getSeconds();
  // 格式化时间，确保显示两位数的时、分、秒
  var hour = (hours < 10) ? '0' + hours : hours;
  var minute = (minutes < 10) ? '0' + minutes : minutes;
  var second = (seconds < 10) ? '0' + seconds : seconds;
  var formattedDate = type === 'yLine'? (month + ' \'' + day): (month + ' ' + day + ', ' + year);
  formattedDate = isNow? formattedDate + '  ' + hour + ':' + minute + ':' +second:formattedDate
  return formattedDate;
}
watch(
  () => route.query.type,
  async () => {
    await getData()
    let xData: any[] = [];
    let yData: string[] = []
    data && data.value.map((i:{tvl:string,timestamp:string},index)=>{
      if (index) {
        xData.unshift({value: i.tvl, date: i.timestamp, type: false})
        const timer = format(i.timestamp,'yLine',false)
        yData.unshift(timer)
      } else {
        xData.unshift({value: i.tvl, date: i.timestamp, type: true})
        yData.unshift('Now')
      }
    })
    const option = {
      title: {
        text: Title,
        left: 'center',
      },
      tooltip: {
          trigger: 'axis',
          formatter: function (params:any) {
            const timer = format(params[0].data.date, 'tooltip',params[0].data.type||false) // X 轴的数据
            var yValue = params[0].data.value; // Y 轴的数据
            return timer + '<br />TVL: $ ' + yValue.toLocaleString();
          }
      },
      grid: {
          left: '18%',    // 左边距
          right: '10%',   // 右边距
      },
      xAxis: {
          type: 'category',
          data: yData,
      },
      yAxis: {
          type: 'value',
          axisLabel: {
              formatter: function (value:any, index:number) {
                  if (value < 1000) {
                      return '$ '+value;
                  } else if (value < 1000000) {
                      return '$ '+(value / 1000).toFixed(0) + 'K';
                  } else {
                      return '$ '+(value / 1000000).toFixed(0) + 'M';
                  }
              }
          }
      },
        dataZoom: [{
            type: 'slider', // 缩放类型为滑动条
            start: 0, // 起始位置
            end: 100 // 结束位置
        }],
      series: [{
          type: 'line',
          smooth: true, // 开启平滑曲线
          data: xData,
          symbol: 'none', // 不显示数据点
          emphasis: {
              focus: 'series'
          },
          // 配置点击下钻
          onclick: function (params:any) {
              console.log(params); // 点击事件参数
              // 进行下钻操作，例如切换数据或者跳转到详情页
          }
      }]
    };
    var myChart = echarts.init(document.getElementById('echartsBox'));
    myChart.setOption(option);
  },
  { immediate: true }
);
onMounted(() => {
});
</script>

<style lang="scss">
.batches-container {
  box-shadow: 0 0.5rem 1.2rem rgba(189,197,209,.2);
  position: relative;
  display: -ms-flexbox;
  display: flex;
  -ms-flex-direction: column;
  flex-direction: column;
  min-width: 0;
  word-wrap: break-word;
  background-color: #fff;
  background-clip: border-box;
  border: 1px solid #e7eaf3;
  border-radius: 0.5rem;
  padding-top: 20px;
  @apply mt-8 mb-4;
  .card-header {
    padding: 0.75rem;
    margin-bottom: 0;
    background-color: #fff;
    border-bottom: 1px solid #e7eaf3;
    color: #4a4f55;
    border-radius: calc(0.5rem - 1px) calc(0.5rem - 1px) 0 0;
  }
  #echartsBox{
    min-height: 500px;
    width: 100%;
  }
}

@media (max-width: 760px) {
  .batches-container{
    #echartsBox {
      min-height: 300px;
    }
  }
}
</style>
