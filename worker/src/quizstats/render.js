const Vega = require('vega');

async function renderSpecToBuffer(spec) {
  const view = new Vega.View(Vega.parse(spec)).renderer('none').initialize();
  const canvas = await view.toCanvas();
  const buffer = canvas.toBuffer();

  return buffer;
}

// https://gist.github.com/rina-andria/6142424f3676233bfb7a9d1067b97b35
const deckPieChartSpec = {
  $schema: 'https://vega.github.io/schema/vega/v3.0.json',
  width: 300,
  height: 300,
  autosize: 'pad',
  background: '#36393f',
  signals: [
    { name: 'startAngle', value: 0 },
    { name: 'endAngle', value: 6.29 },
    { name: 'padAngle', value: 0 },
    { name: 'sort', value: true },
    { name: 'strokeWidth', value: 2 },
    {
      name: 'selected',
      value: '',
      on: [{ events: 'mouseover', update: 'datum' }],
    },
  ],
  data: [
    {
      name: 'table',
      values: [
        { deckId: 'Africa', points: 1216130000 },
        { deckId: 'Asia', points: 4436224000 },
        { deckId: 'Europe', points: 738849000 },
        { deckId: 'North America', points: 579024000 },
        { deckId: 'Oceania', points: 39901000 },
        { deckId: 'South America', points: 422535000 },
      ],
      transform: [
        {
          type: 'pie',
          field: 'points',
          startAngle: { signal: 'startAngle' },
          endAngle: { signal: 'endAngle' },
          sort: { signal: 'sort' },
        },
      ],
    },
    {
      name: 'fieldSum',
      source: 'table',
      transform: [
        {
          type: 'aggregate',
          fields: ['points'],
          ops: ['sum'],
          as: ['sum'],
        },
      ],
    },
  ],
  legends: [
    {
      labelColor: '#ffffff',
      titleColor: '#ffffff',
      fill: 'color',
      title: 'Decks',
      orient: 'none',
      padding: { value: 10 },
      encode: {
        symbols: { enter: { fillOpacity: { value: 1 } } },
        legend: {
          update: {
            x: {
              signal: '(width / 2) + if(selected && selected.deckId == datum.deckId, if(width >= height, height, width) / 2 * 1.1 * 0.8, if(width >= height, height, width) / 2 * 0.8)',
              offset: 20,
            },
            y: 0,
          },
        },
      },
    },
  ],
  scales: [
    { name: 'color', type: 'ordinal', range: { scheme: 'category20' } },
  ],
  marks: [
    {
      type: 'arc',
      from: { data: 'table' },
      encode: {
        enter: {
          fill: { scale: 'color', field: 'deckId' },
          x: { signal: 'width / 2' },
          y: { signal: 'height / 2' },
        },
        update: {
          startAngle: { field: 'startAngle' },
          endAngle: { field: 'endAngle' },
          padAngle: {
            signal: 'if(selected && selected.deckId == datum.deckId, 0.015, 0.015)',
          },
          innerRadius: {
            signal: 'if(selected && selected.deckId == datum.deckId, if(width >= height, height, width) / 2 * 0.45, if(width >= height, height, width) / 2 * 0.5)',
          },
          outerRadius: {
            signal: 'if(selected && selected.deckId == datum.deckId, if(width >= height, height, width) / 2 * 1.05 * 0.8, if(width >= height, height, width) / 2 * 0.8)',
          },
          opacity: {
            signal: 'if(selected && selected.deckId !== datum.deckId, 1, 1)',
          },
          stroke: { signal: "scale('color', datum.deckId)" },
          strokeWidth: { signal: 'strokeWidth' },
          fillOpacity: {
            signal: 'if(selected && selected.deckId == datum.deckId, 0.8, 0.8)',
          },
        },
      },
    },
    {
      type: 'text',
      encode: {
        enter: { fill: { value: '#ffffff' }, text: { value: '' } },
        update: {
          opacity: { value: 1 },
          x: { signal: 'width / 2' },
          y: { signal: 'height / 2' },
          align: { value: 'center' },
          baseline: { value: 'middle' },
          fontSize: { signal: 'if(width >= height, height, width) * 0.05' },
          text: { value: 'Points Per Deck' },
        },
      },
    },
    {
      name: 'mark_points',
      type: 'text',
      from: { data: 'table' },
      encode: {
        enter: {
          text: {
            signal: "if(datum['endAngle'] - datum['startAngle'] < 0.3, '', datum['points'])",
          },
          x: { signal: 'if(width >= height, height, width) / 2' },
          y: { signal: 'if(width >= height, height, width) / 2' },
          radius: {
            signal: 'if(selected && selected.deckId == datum.deckId, if(width >= height, height, width) / 2 * 1.05 * 0.65, if(width >= height, height, width) / 2 * 0.65)',
          },
          theta: { signal: "(datum['startAngle'] + datum['endAngle'])/2" },
          fill: { value: '#ffffff' },
          fontSize: { value: 12 },
          align: { value: 'center' },
          baseline: { value: 'middle' },
        },
      },
    },
  ],
};

async function renderDeckPieChart(stats) {
  const spec = { ...deckPieChartSpec };
  spec.data = [...spec.data];
  spec.data[0] = { ...spec.data[0] };
  spec.data[0].values = Object.entries(stats.questionsAnsweredPerDeck)
    .map(([deckId, points]) => ({
      deckId,
      points,
    })).sort((a, b) => b.points - a.points);

  return renderSpecToBuffer(spec);
}

// https://vega.github.io/vega/examples/stacked-bar-chart/
const stackedBarChartSpec = {
  $schema: 'https://vega.github.io/schema/vega/v5.json',
  width: 500,
  height: 200,
  padding: 5,
  background: '#36393f',

  data: [
    {
      name: 'table',
      values: [
        { x: 0, y: 28, c: 0 }, { x: 0, y: 55, c: 1 },
        { x: 1, y: 43, c: 0 }, { x: 1, y: 91, c: 1 },
        { x: 2, y: 81, c: 0 }, { x: 2, y: 53, c: 1 },
        { x: 3, y: 19, c: 0 }, { x: 3, y: 87, c: 1 },
        { x: 4, y: 52, c: 0 }, { x: 4, y: 48, c: 1 },
        { x: 5, y: 24, c: 0 }, { x: 5, y: 49, c: 1 },
        { x: 6, y: 87, c: 0 }, { x: 6, y: 66, c: 1 },
        { x: 7, y: 17, c: 0 }, { x: 7, y: 27, c: 1 },
        { x: 8, y: 68, c: 0 }, { x: 8, y: 16, c: 1 },
        { x: 9, y: 49, c: 0 }, { x: 9, y: 15, c: 1 },
      ],
      transform: [
        {
          type: 'stack',
          groupby: ['x'],
          sort: { field: 'c' },
          field: 'y',
        },
      ],
    },
  ],

  scales: [
    {
      name: 'x',
      type: 'band',
      range: 'width',
      domain: { data: 'table', field: 'x' },
    },
    {
      name: 'y',
      type: 'linear',
      range: 'height',
      nice: true,
      zero: true,
      domain: { data: 'table', field: 'y1' },
    },
    {
      name: 'color',
      type: 'ordinal',
      range: ['#8053ef', '#efb953'],
      domain: { data: 'table', field: 'c' },
    },
  ],

  axes: [
    {
      orient: 'bottom', scale: 'x', zindex: 1, labelColor: '#ffffff', title: 'Days ago', titleColor: '#ffffff',
    },
    {
      orient: 'left', scale: 'y', zindex: 1, labelColor: '#ffffff', title: 'Questions Answered / Seen', titleColor: '#ffffff',
    },
  ],

  marks: [
    {
      type: 'rect',
      from: { data: 'table' },
      encode: {
        enter: {
          x: { scale: 'x', field: 'x' },
          width: { scale: 'x', band: 1, offset: -1 },
          y: { scale: 'y', field: 'y0' },
          y2: { scale: 'y', field: 'y1' },
          fill: { scale: 'color', field: 'c' },
        },
        update: {
          fillOpacity: { value: 1 },
        },
        hover: {
          fillOpacity: { value: 0.5 },
        },
      },
    },
  ],
};

async function renderPointsPerDayChart(stats) {
  const spec = { ...stackedBarChartSpec };
  spec.width = stats.dailyStats.length * 18;
  spec.data = [...spec.data];
  spec.data[0] = { ...spec.data[0] };

  const values = [];
  stats.dailyStats.forEach((dailyStats, i) => {
    const numCorrect = dailyStats.questionsAnswered;
    const numSeen = dailyStats.questionsSeen;
    const daysAgo = stats.dailyStats.length - i;

    values.push({ x: daysAgo, y: numCorrect, c: 0 });
    values.push({ x: daysAgo, y: numSeen - numCorrect, c: 1 });
  });

  spec.data[0].values = values;

  const buf = await renderSpecToBuffer(spec);

  return buf;
}

// https://vega.github.io/vega/examples/line-chart/
const percentCorrectChartSpec = {
  $schema: 'https://vega.github.io/schema/vega/v5.json',
  width: 500,
  height: 200,
  padding: 5,
  title: {
    text: 'Percent Correct (5 day WMA)',
    color: '#ffffff',
  },
  background: '#36393f',

  signals: [
    {
      name: 'interpolate',
      value: 'linear',
      bind: {
        input: 'select',
        options: [
          'basis',
          'cardinal',
          'catmull-rom',
          'linear',
          'monotone',
          'natural',
          'step',
          'step-after',
          'step-before',
        ],
      },
    },
  ],

  data: [
    {
      name: 'table',
      values: [
        { x: 0, y: 28, c: 0 }, { x: 0, y: 20, c: 1 },
        { x: 1, y: 43, c: 0 }, { x: 1, y: 35, c: 1 },
        { x: 2, y: 81, c: 0 }, { x: 2, y: 10, c: 1 },
        { x: 3, y: 19, c: 0 }, { x: 3, y: 15, c: 1 },
        { x: 4, y: 52, c: 0 }, { x: 4, y: 48, c: 1 },
        { x: 5, y: 24, c: 0 }, { x: 5, y: 28, c: 1 },
        { x: 6, y: 87, c: 0 }, { x: 6, y: 66, c: 1 },
        { x: 7, y: 17, c: 0 }, { x: 7, y: 27, c: 1 },
        { x: 8, y: 68, c: 0 }, { x: 8, y: 16, c: 1 },
        { x: 9, y: 49, c: 0 }, { x: 9, y: 25, c: 1 },
      ],
    },
  ],

  scales: [
    {
      name: 'x',
      type: 'point',
      range: 'width',
      domain: { data: 'table', field: 'x' },
    },
    {
      name: 'y',
      type: 'linear',
      range: 'height',
      nice: true,
      zero: true,
      domain: { data: 'table', field: 'y' },
    },
    {
      name: 'color',
      type: 'ordinal',
      range: ['#8053ef'],
      domain: { data: 'table', field: 'c' },
    },
  ],

  axes: [
    {
      orient: 'bottom', scale: 'x', labelColor: '#ffffff', title: 'Days ago', titleColor: '#ffffff',
    },
    {
      orient: 'left', scale: 'y', labelColor: '#ffffff', title: 'Percent Correct', titleColor: '#ffffff',
    },
  ],

  marks: [
    {
      type: 'group',
      from: {
        facet: {
          name: 'series',
          data: 'table',
          groupby: 'c',
        },
      },
      marks: [
        {
          type: 'line',
          from: { data: 'series' },
          encode: {
            enter: {
              x: { scale: 'x', field: 'x' },
              y: { scale: 'y', field: 'y' },
              stroke: { scale: 'color', field: 'c' },
              strokeWidth: { value: 2 },
            },
            update: {
              interpolate: { signal: 'interpolate' },
              fillOpacity: { value: 1 },
            },
            hover: {
              fillOpacity: { value: 0.5 },
            },
          },
        },
      ],
    },
  ],
};

async function renderPercentCorrectWMAChart(stats) {
  const spec = { ...percentCorrectChartSpec };
  spec.width = stats.percentCorrectWMA.length * 18;
  spec.data = [...spec.data];
  spec.data[0] = { ...spec.data[0] };
  spec.scales = [...spec.scales];
  spec.scales[1] = { ...spec.scales[1] };

  const min = stats.percentCorrectWMA.reduce((a, w) => Math.min(a, w), 100);
  spec.scales[1].domainMin = Math.ceil(min - 5);
  spec.scales[1].domainMax = 100;
  spec.data[0].values = stats.percentCorrectWMA.map((wma, i) => {
    const daysAgo = stats.dailyStats.length - i;
    return {
      x: daysAgo,
      y: wma,
      c: 0,
    };
  });

  const buf = await renderSpecToBuffer(spec);

  return buf;
}

async function renderAggregate(stats) {
  const charts = await Promise.all([
    renderDeckPieChart(stats),
    renderPointsPerDayChart(stats),
    renderPercentCorrectWMAChart(stats),
  ]);

  return {
    deckPieChart: charts[0].toString('base64'),
    pointsPerDayChart: charts[1].toString('base64'),
    percentCorrectChart: charts[2].toString('base64'),
  };
}

module.exports = renderAggregate;
