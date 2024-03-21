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
const { t } = useI18n();

const context = useContext();
const route = useRoute();
const Title = route.query.type === 'TVL'? 'zkLink Nova Daily TVL Chart': 'zkLink Nova Unique Addresses Chart'
const { load, pending, failed, data, total, pageSize, page } = useBatches(context);
let option = {
  title: {
    text: Title,
    left: 'center',
  },
  tooltip: {
      trigger: 'axis',
      formatter: function (params:any) {
        var xValue = params[0].axisValue; // X 轴的数据
        var yValue = params[0].data; // Y 轴的数据
        return xValue + '<br />Total Transactions:' + yValue.toLocaleString();
      }
  },
  xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  },
  yAxis: {
      type: 'value',
      axisLabel: {
          formatter: function (value:any, index:number) {
              if (value < 1000) {
                  return value;
              } else if (value < 1000000) {
                  return (value / 1000).toFixed(0) + ' K';
              } else {
                  return (value / 1000000).toFixed(0) + ' M';
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
      data: [120000, 20000, 150000000, 800000, 7000, 1100, 130],
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
watch(
  () => route.query.type,
  (page) => {

  },
  { immediate: true }
);
onMounted(() => {
  var myChart = echarts.init(document.getElementById('echartsBox'));
  myChart.setOption(option);
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
</style>
