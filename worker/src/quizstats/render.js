const Vega = require('vega');

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

  const view = new Vega.View(Vega.parse(spec)).renderer('none').initialize();
  const canvas = await view.toCanvas();
  const buffer = canvas.toBuffer();

  return buffer;
}

function renderAggregate(stats) {
  return renderDeckPieChart(stats);
}

module.exports = renderAggregate;
