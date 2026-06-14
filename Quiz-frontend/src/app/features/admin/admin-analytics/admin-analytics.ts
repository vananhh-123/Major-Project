import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexStroke,
  ApexFill,
  ApexDataLabels,
  ApexGrid,
  ApexTooltip,
  ApexMarkers,
  ApexLegend
} from 'ng-apexcharts';

interface AnalyticsKpi {
  label: string;
  value: string;
  note: string;
  icon: string;
  iconClass: string;
  trendClass: string;
}

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  fill: ApexFill;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  tooltip: ApexTooltip;
  markers: ApexMarkers;
  legend: ApexLegend;
  colors: string[];
};

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './admin-analytics.html',
  styleUrl: './admin-analytics.css'
})
export class AdminAnalytics {
  kpis: AnalyticsKpi[] = [
    {
      label: 'Page Views',
      value: '2.4M',
      note: '+18.3%',
      icon: 'visibility',
      iconClass: 'bg-primary-soft text-primary',
      trendClass: 'text-tertiary'
    },
    {
      label: 'Avg Session',
      value: '8.4m',
      note: '+2.1%',
      icon: 'timer',
      iconClass: 'bg-secondary-soft text-secondary',
      trendClass: 'text-primary'
    },
    {
      label: 'Bounce Rate',
      value: '21.7%',
      note: '-3.2%',
      icon: 'logout',
      iconClass: 'bg-tertiary-soft text-tertiary',
      trendClass: 'text-tertiary'
    },
    {
      label: 'Completion Rate',
      value: '74.2%',
      note: '+6.8%',
      icon: 'check_circle',
      iconClass: 'bg-primary-soft text-primary',
      trendClass: 'text-primary'
    }
  ];

  chartOptions: ChartOptions = {
    series: [
      {
        name: 'Active Users',
        data: [
          4300, 4100, 4700, 3600, 4250,
          4200, 4650, 3400, 3650, 2550,
          2950, 3450, 3850, 3650, 2550,
          4400, 3650, 4420, 4300, 4380,
          4520, 4870, 3250, 2920, 4320,
          3150, 2450, 2420, 2480, 3200
        ]
      },
      {
        name: '7-day Avg',
        data: [
          null, null, null, null, null,
          null, 4200, 4100, 4050, 3820,
          3600, 3450, 3350, 3200, 3250,
          3400, 3600, 3750, 3850, 3950,
          4100, 4350, 4200, 4100, 4080,
          3900, 3650, 3400, 3000, 3250
        ]
      }
    ],

    chart: {
      type: 'area',
      height: 360,
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      },
      animations: {
        enabled: true,
        speed: 950,
        animateGradually: {
          enabled: true,
          delay: 80
        },
        dynamicAnimation: {
          enabled: true,
          speed: 500
        }
      },
      fontFamily: 'Manrope, Arial, sans-serif',
      foreColor: '#68537c'
    },

    colors: ['#6e12f8', '#b30064'],

    stroke: {
      curve: 'smooth',
      width: [4, 2],
      dashArray: [0, 6]
    },

    fill: {
      type: 'gradient',
      opacity: [0.28, 0],
      gradient: {
        shadeIntensity: 0.2,
        opacityFrom: 0.28,
        opacityTo: 0.03,
        stops: [0, 90, 100]
      }
    },

    dataLabels: {
      enabled: false
    },

    markers: {
      size: 0,
      strokeWidth: 3,
      strokeColors: '#ffffff',
      hover: {
        size: 7
      }
    },

    grid: {
      borderColor: 'rgba(188, 164, 209, 0.24)',
      strokeDashArray: 0,
      xaxis: {
        lines: {
          show: false
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      },
      padding: {
        left: 8,
        right: 8,
        top: 8,
        bottom: 0
      }
    },

    xaxis: {
      categories: [
        'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5',
        'Day 6', 'Day 7', 'Day 8', 'Day 9', 'Day 10',
        'Day 11', 'Day 12', 'Day 13', 'Day 14', 'Day 15',
        'Day 16', 'Day 17', 'Day 18', 'Day 19', 'Day 20',
        'Day 21', 'Day 22', 'Day 23', 'Day 24', 'Day 25',
        'Day 26', 'Day 27', 'Day 28', 'Day 29', 'Day 30'
      ],
      tickAmount: 7,
      labels: {
        style: {
          colors: '#8a78a0',
          fontSize: '12px',
          fontWeight: 700
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      },
      tooltip: {
        enabled: false
      }
    },

    yaxis: {
      min: 2000,
      max: 5000,
      tickAmount: 6,
      labels: {
        formatter: (value: number): string => {
          return `${value / 1000}k`;
        },
        style: {
          colors: '#8a78a0',
          fontSize: '12px',
          fontWeight: 700
        }
      }
    },

    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      theme: 'light',
      marker: {
        show: true
      },
      y: {
        formatter: (value: number): string => {
          return `${value.toLocaleString()}`;
        }
      }
    },

    legend: {
      show: false
    }
  };
}