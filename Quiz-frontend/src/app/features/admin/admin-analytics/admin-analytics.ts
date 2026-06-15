import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

import { AdminApi, AnalyticsApi } from '../../../services/admin-api';

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
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './admin-analytics.html',
  styleUrl: './admin-analytics.css'
})
export class AdminAnalytics implements OnInit {
  selectedRange = '30';

  soloGames = 0;
  multiGames = 0;
  totalReviews = 0;
  activeRooms = 0;

  kpis: AnalyticsKpi[] = [];

  chartOptions: ChartOptions = this.buildChartOptions([0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]);

  constructor(
    private adminApi: AdminApi,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  changeRange(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.adminApi.getAnalytics(this.selectedRange).subscribe({
      next: (data: AnalyticsApi) => {
        const totalGames = Number(data.totalResults || 0);
        const solo = Number(data.soloGames || 0);
        const multi = Number(data.multiGames || 0);
        const reviews = Number(data.totalReviews || 0);

        this.soloGames = solo;
        this.multiGames = multi;
        this.totalReviews = reviews;
        this.activeRooms = 0;

        this.kpis = [
          {
            label: 'Total Users',
            value: this.formatNumber(data.totalUsers || 0),
            note: this.getRangeLabel(),
            icon: 'group',
            iconClass: 'bg-primary-soft text-primary',
            trendClass: 'text-primary'
          },
          {
            label: 'Total Quizzes',
            value: this.formatNumber(data.totalQuizzes || 0),
            note: 'Created quiz content',
            icon: 'quiz',
            iconClass: 'bg-secondary-soft text-secondary',
            trendClass: 'text-primary'
          },
          {
            label: 'Total Results',
            value: this.formatNumber(totalGames),
            note: `${solo} solo / ${multi} multi`,
            icon: 'sports_esports',
            iconClass: 'bg-tertiary-soft text-tertiary',
            trendClass: 'text-tertiary'
          },
          {
            label: 'Reviews',
            value: this.formatNumber(reviews),
            note: 'Community feedback',
            icon: 'rate_review',
            iconClass: 'bg-primary-soft text-primary',
            trendClass: 'text-primary'
          }
        ];

        this.chartOptions = this.buildChartOptions(
          this.makeTrendSeries(solo),
          this.makeTrendSeries(multi)
        );

        this.cdr.detectChanges();
      },
      error: () => {
        this.setFallbackData();
      }
    });
  }

  getRangeLabel(): string {
    if (this.selectedRange === 'today') return 'Today';
    if (this.selectedRange === '7') return 'Last 7 days';
    if (this.selectedRange === '30') return 'Last 30 days';
    return 'All time';
  }

  private setFallbackData(): void {
    this.soloGames = 0;
    this.multiGames = 0;
    this.totalReviews = 0;
    this.activeRooms = 0;

    this.kpis = [
      {
        label: 'Total Users',
        value: '0',
        note: 'Backend unavailable',
        icon: 'group',
        iconClass: 'bg-primary-soft text-primary',
        trendClass: 'text-primary'
      },
      {
        label: 'Total Quizzes',
        value: '0',
        note: 'Backend unavailable',
        icon: 'quiz',
        iconClass: 'bg-secondary-soft text-secondary',
        trendClass: 'text-primary'
      },
      {
        label: 'Total Results',
        value: '0',
        note: 'Backend unavailable',
        icon: 'sports_esports',
        iconClass: 'bg-tertiary-soft text-tertiary',
        trendClass: 'text-tertiary'
      },
      {
        label: 'Reviews',
        value: '0',
        note: 'Backend unavailable',
        icon: 'rate_review',
        iconClass: 'bg-primary-soft text-primary',
        trendClass: 'text-primary'
      }
    ];

    this.chartOptions = this.buildChartOptions(
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0]
    );

    this.cdr.detectChanges();
  }

  private makeTrendSeries(total: number): number[] {
    const value = Math.max(Number(total || 0), 0);

    if (value === 0) {
      return [0, 0, 0, 0, 0, 0, 0];
    }

    return [
      Math.max(Math.round(value * 0.12), 1),
      Math.max(Math.round(value * 0.2), 1),
      Math.max(Math.round(value * 0.32), 1),
      Math.max(Math.round(value * 0.45), 1),
      Math.max(Math.round(value * 0.62), 1),
      Math.max(Math.round(value * 0.78), 1),
      value
    ];
  }

  private buildChartOptions(soloData: number[], multiData: number[]): ChartOptions {
    const maxValue = Math.max(...soloData, ...multiData, 5);

    return {
      series: [
        {
          name: 'Solo Games',
          data: soloData
        },
        {
          name: 'Multi Games',
          data: multiData
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
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 80
          },
          dynamicAnimation: {
            enabled: true,
            speed: 400
          }
        },
        fontFamily: 'Manrope, Arial, sans-serif',
        foreColor: '#68537c'
      },

      colors: ['#6e12f8', '#b30064'],

      stroke: {
        curve: 'smooth',
        width: [4, 3],
        dashArray: [0, 6]
      },

      fill: {
        type: 'gradient',
        opacity: [0.28, 0.08],
        gradient: {
          shadeIntensity: 0.2,
          opacityFrom: 0.3,
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
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
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
        min: 0,
        max: Math.ceil(maxValue * 1.2),
        tickAmount: 5,
        labels: {
          formatter: (value: number): string => {
            return `${Math.round(value)}`;
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
            return `${Math.round(value)} games`;
          }
        }
      },

      legend: {
        show: false
      }
    };
  }

  formatNumber(value: number): string {
    return Number(value || 0).toLocaleString();
  }
}