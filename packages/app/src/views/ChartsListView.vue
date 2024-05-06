<template>
  <div>
    <h1>zkLink Nova  Charts &  Statistics</h1>
    <div class="batches-container">
      <div class="p-4 md:flex flex-wrap">
        <div class="rounded flex-auto box">
          <div class="title">
            <a href="/charts/chart?type=TVL" class="p-2 inline-block w-full no-underline">Daily TVL Chart</a>
          </div>
          <div class="p-2 content">
            <a href="/charts/chart?type=TVL" class="inline-block w-full relative">
              <div class="absolute w-full h-full top-0 left-0 z-10"></div>
              <div class="w-full h-28" id="TVLChart"></div>
            </a>
          </div>
        </div>
        <div class="rounded flex-auto box">
          <div class="title">
            <a href="/charts/chart?type=UAW" class="p-2 inline-block w-full no-underline">Unique Addresses Chart</a>
          </div>
          <div class="p-2 content">
            <a href="/charts/chart?type=UAW" class="inline-block w-full relative">
              <div class="absolute w-full h-full top-0 left-0 z-10"></div>
              <div class="w-full h-28" id="addChart"></div>
            </a>
          </div>
        </div>
        <div class="rounded flex-auto box">
          <div class="title">
            <a href="/charts/chart?type=Tra" class="p-2 inline-block w-full no-underline">Daily Transactions Chart</a>
          </div>
          <div class="p-2 content">
            <a href="/charts/chart?type=Tra" class="inline-block w-full relative">
              <div class="absolute w-full h-full top-0 left-0 z-10"></div>
              <div class="w-full h-28" id="traChart"></div>
            </a>
          </div>
        </div>
        <div class="rounded flex-auto box">
          <div class="title">
            <a href="/charts/chart?type=INT" class="p-2 inline-block w-full no-underline">Daily Interacted Address Chart</a>
          </div>
          <div class="p-2 content">
            <a href="/charts/chart?type=INT" class="inline-block w-full relative">
              <div class="absolute w-full h-full top-0 left-0 z-10"></div>
              <div class="w-full h-28" id="intChart"></div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import useBatches from "@/composables/useBatches";
import useContext from "@/composables/useContext";
import useChartsData from "@/composables/useChartsData";
import * as echarts from 'echarts';
const { getData,data } = useChartsData();
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
  var hour = (hours < 10) ? '0' + hours : hours;
  var minute = (minutes < 10) ? '0' + minutes : minutes;
  var second = (seconds < 10) ? '0' + seconds : seconds;
  var formattedDate = type === 'yLine'? (month + ' \'' + day): (month + ' ' + day + ', ' + year);
  formattedDate = isNow? formattedDate + '  ' + hour + ':' + minute + ':' +second:formattedDate
  return formattedDate;
}
const { t } = useI18n();

const context = useContext();
const route = useRoute();
const setChart = (xData: any[],yData: string[]) => {
  let option = {
    animation: false,
    interactive: false,
    grid: {
        top: '10%',
        left: '15%',
        right: '5%',
        bottom: '15%'
    },
    xAxis: {
        type: 'category',
        data: yData,
        axisTick: {
          show: false
        },
        axisLabel: {
            textStyle: {
                fontSize: 6
            },
        }
    },
    yAxis: {
        type: 'value',
        axisLabel: {
            textStyle: {
                fontSize: 6
            },
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
    series: [{
        type: 'line',
        smooth: true,
        data: xData,
        symbol: 'none',
        emphasis: {
            focus: 'series'
        },
        onclick: function (params:any) {
            console.log(params);
        },
        lineStyle: {
            width: 1
        },
        itemStyle: {
          normal: {
              color: '#000'
          }
        }
    }]
  };
  return option
}
onMounted(async() => {
  await getData('TVL')
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
  var myChart = echarts.init(document.getElementById('TVLChart'));
  myChart.setOption(setChart(xData,yData));
  await getData('UAW')
  xData = []
  yData = []
  data && data.value.map((i:{uaw:string,timestamp:string},index)=>{
    if (index) {
      xData.unshift({value: i.uaw, date: i.timestamp, type: false})
      const timer = format(i.timestamp,'yLine',false)
      yData.unshift(timer)
    } else {
      xData.unshift({value: i.uaw, date: i.timestamp, type: true})
      yData.unshift('Now')
    }
  })
  var addChart = echarts.init(document.getElementById('addChart'));
  addChart.setOption(setChart(xData,yData));
  await getData('Tra')
  xData = []
  yData = []
  data && data.value.items.map((i:{txNum:number,timestamp:string},index)=>{
    // if (index) {
      xData.unshift({value: i.txNum, date: i.timestamp, type: false})
      const timer = format(i.timestamp,'yLine',false)
      yData.unshift(timer)
    // } else {
    //   xData.unshift({value: i.txNum, date: i.timestamp, type: true})
    //   yData.unshift('Now')
    // }
  })
  var traChart = echarts.init(document.getElementById('traChart'));
  traChart.setOption(setChart(xData,yData));
  await getData('INT')
  xData = []
  yData = []
  data && data.value.items.map((i:{exchangeNum:number,timestamp:string},index)=>{
    // if (index) {
      xData.unshift({value: i.exchangeNum, date: i.timestamp, type: false})
      const timer = format(i.timestamp,'yLine',false)
      yData.unshift(timer)
    // } else {
    //   xData.unshift({value: i.txNum, date: i.timestamp, type: true})
    //   yData.unshift('Now')
    // }
  })
  var intChart = echarts.init(document.getElementById('intChart'));
  intChart.setOption(setChart(xData,yData));
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
  @apply mt-8 mb-4;
  .card-header {
    padding: 0.75rem;
    margin-bottom: 0;
    background-color: #fff;
    border-bottom: 1px solid #e7eaf3;
    color: #4a4f55;
    border-radius: calc(0.5rem - 1px) calc(0.5rem - 1px) 0 0;
  }
}

@media (max-width: 760px) {
  .box {
    max-width: 100%;
  }
}
.box{
  max-width: 25%;
  margin-right: 20px;
  margin-bottom: 20px;
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
  .title{
    background-color: #f8f9fa;
    margin-bottom: 0;
    background-color: #f8f9fa !important;
    border-bottom: 1px solid #e7eaf3;
    a{
      color: #28a0f0;
    }
    a:hover{
      color: #28a0f0;
    }
  }
  .content{
    a{
      min-height: 1px;
      img{
        min-height: 30px;
      }
    }
  }
}

@media (max-width: 760px) {
  .box {
    max-width: 100%;
  }
}
</style>
