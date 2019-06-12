import { getDbIds } from '../indexedDB/index.js';

const MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
];

const barColor = 'orange';

const dashboard = (id, sData) => {
    // Format data
    let fData = JSON.parse(JSON.stringify(sData));
    fData = d3.keys(MONTH_NAMES).map(s => {
        const prices = {};
        fData.forEach(t => {
            const months = t.end - t.start + 1;
            if (s == t.start && s == t.end) {
                prices[t.name] = t.totalPrice;
            } else if (months === 2) {
                prices[t.name] =
                    s == t.start
                        ? t.totalPrice * 0.3
                        : s == t.end
                            ? t.totalPrice * 0.7
                            : 0;
            } else {
                const percentage = 0.8 / (months - 2); //Math.random();
                prices[t.name] =
                    s == t.start
                        ? t.totalPrice * 0.1
                        : s > t.start && s < t.end
                            ? t.totalPrice * percentage
                            : s == t.end
                                ? t.totalPrice
                                : 0;
                t.totalPrice -=
                    s == t.start
                        ? t.totalPrice * 0.1
                        : s > t.start && s < t.end
                            ? t.totalPrice * percentage
                            : 0;
            }
        });

        return { month: MONTH_NAMES[s], prices };
    });
    // compute total for each month
    fData.forEach(d => {
        d.total = 0;
        for (let key in d.prices) {
            d.total += d.prices[key];
        }
    });

    // Create currency format locale
    const locale = d3.formatLocale({
        decimal: '.',
        thousands: ',',
        grouping: [3],
        currency: ['', '€']
    });

    // function to handle bar chart.
    const costFlow = pD => {
        const cF = {},
            cFdim = { t: 60, r: 0, b: 30, l: 0 };
        cFdim.w = 600 - cFdim.l - cFdim.r;
        cFdim.h = 300 - cFdim.t - cFdim.b;

        // create svg for bar chart
        const cFsvg = d3
            .select(id)
            .append('svg')
            .attr('width', cFdim.w + cFdim.t + cFdim.b)
            .attr('height', cFdim.h + cFdim.t + cFdim.b)
            .append('g')
            .attr('transform', `translate(${cFdim.l},${cFdim.t})`);

        // create function for x-axis mapping.
        const x = d3
            .scaleBand()
            .domain(pD.map(d => d[0]))
            .range([0, cFdim.w])
            .padding(0.1);

        // Add x-axis to the bar chart svg.
        cFsvg
            .append('g')
            .attr('class', 'x axis')
            .attr('transform', `translate(0,${cFdim.h})`)
            .call(d3.axisBottom(x).tickSizeOuter(0));

        // Add bar chart title
        cFsvg
            .append('text')
            .attr('x', cFdim.w / 2)
            .attr('y', -cFdim.b)
            .attr('class', 'h5')
            .attr('id', 'chart-title')
            .text('Cash Flow Per Month For All Segmentes');

        // Create function for y-axis map.
        const y = d3
            .scaleLinear()
            .domain([0, d3.max(pD, d => d[1])])
            .nice()
            .range([cFdim.h, 0]);

        const onclick = async d => {
            console.log(d.data);
            const month = MONTH_NAMES.findIndex(t => t === d[0]);
            const segmentNames = sData
                .filter(s => month >= s.start && month <= s.end)
                .map(s => s.name);
            const dbIds = await getDbIds(segmentNames);
            console.log(dbIds);
            NOP_VIEWER.select(dbIds, Autodesk.Viewing.SelectionMode.REGULAR);
        };

        // Create bars for bar chart to contain rectangles and month labels.
        const bars = cFsvg
            .selectAll('.bar')
            .data(pD)
            .enter()
            .append('g')
            .attr('class', 'bar')
            .on('click', onclick);

        // Utility function to be called on mouseovers.
        const mouseover = d => {
            // filter for selected state.
            const st = fData.filter(s => s.month == d[0])[0];
            const nD = d3
                .keys(st.prices)
                .map(s => ({ segment: s, price: st.prices[s] }));

            // Call update function of pie-chart and legend.
            pC.update(nD);
            leg.update(nD, d[0]);
        };

        // Utility function to be called on mouseout.
        const mouseout = d => {
            // Reset the pie-chart and legend
            pC.update(tP);
            leg.update(tP, '');
        };

        // Create the rectangles.
        bars.append('rect')
            .attr('x', d => x(d[0]))
            .attr('y', d => y(d[1]))
            .attr('width', x.bandwidth())
            .attr('height', d => cFdim.h - y(d[1]))
            .attr('fill', barColor)
            .attr('style', 'cursor: pointer')
            .on('mouseover', mouseover)
            .on('mouseout', mouseout);
        // .on('click', onclick);

        bars.append('text')
            .text(d => locale.format('$,')(Math.round(d[1])))
            .attr('x', function(d) {
                return x(d[0]) + x.bandwidth() / 2;
            })
            .attr('y', d => y(d[1] + 5))
            .attr('text-anchor', 'middle')
            .attr('class', 'small');

        // Create function to update the bars. This will be used by pie-chart.
        cF.update = (nD, color, name) => {
            // update the domain of the y-axis map to reflect change in segments.
            y.domain([0, d3.max(nD, d => d[1])]);

            // Attach the new data to the bars.
            const bars = cFsvg.selectAll('.bar').data(nD);

            // Transition the height and color of rectangles.
            bars.select('rect')
                .transition()
                .duration(500)
                .attr('y', d => y(d[1]))
                .attr('height', d => cFdim.h - y(d[1]))
                .attr('fill', color);

            // Transition the segment labels location and change value.
            bars.select('text')
                .transition()
                .duration(500)
                .text(d => locale.format('$,')(Math.round(d[1])))
                .attr('y', d => y(d[1] + 5));

            // Update bar chart title
            cFsvg
                .select('#chart-title')
                .text(`Clash Flow Per Month For ${name}`);
        };

        return cF;
    };

    // function to handle pieChart.
    const pieChart = pD => {
        const pC = {},
            pieDim = { w: 550, h: 550 };
        pieDim.r = Math.min(pieDim.w, pieDim.h) / 2;

        // Create svg for pie chart.
        const piesvg = d3
            .select('#pie-charts')
            .append('svg')
            .attr('width', pieDim.w)
            .attr('height', pieDim.h)
            .append('g')
            .attr('transform', `translate(${pieDim.w / 2},${pieDim.h / 2})`);

        // Create function to draw the arcs of the pie slices.
        const arc = d3
            .arc()
            .outerRadius(pieDim.r - 10)
            .innerRadius(0);

        // Create a function to compute the pie slice angles.
        const pie = d3
            .pie()
            .sort(null)
            .value(d => d.price);

        // Utility function to be called on mouseover a pie slice.
        const mouseover = d => {
            // Call the update function of bar chart with the new data.
            cF.update(
                fData.map(v => [
                    v.month,
                    typeof v.prices[d.data.segment] === 'undefined'
                        ? 0
                        : v.prices[d.data.segment]
                ]),
                segColor(d.data.segment),
                d.data.segment
            );
        };

        // Utility function to be called on mouseout a pie slice.
        const mouseout = d => {
            // Call the update function of bar chart with all the data.
            cF.update(
                fData.map(v => [v.month, v.total]),
                barColor,
                'All Segmentes'
            );
        };

        const onclick = async d => {
            console.log(d.data);
            const dbIds = await getDbIds([d.data.segment]);
            NOP_VIEWER.select(dbIds, Autodesk.Viewing.SelectionMode.REGULAR);
        };

        // Draw the pie slices.
        piesvg
            .selectAll('path')
            .data(pie(pD))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('style', 'cursor: pointer')
            .attr('fill', d => segColor(d.data.segment))
            .on('mouseover', mouseover)
            .on('mouseout', mouseout)
            .on('click', onclick)
            .append('title')
            .text(d => `${d.data.segment}`);

        // Create function to update pie-chart. This will be used by bar chart.
        pC.update = nD => {
            piesvg
                .selectAll('path')
                .data(pie(nD))
                .transition()
                .duration(500)
                .attrTween('d', arcTween);
        };

        function arcTween(a) {
            const i = d3.interpolate(this._current, a);
            this._current = i(0);
            return t => arc(i(t));
        }

        return pC;
    };

    // Function to handle legend.
    const legend = lD => {
        const leg = {};

        const getLegend = (d, aD) =>
            d3.format('.2%')(d.price / d3.sum(aD.map(v => v.price)));

        // Create table for legend.
        const legend = d3
            .select('#pie-charts')
            .append('table')
            .attr('class', 'legend');

        legend
            .append('thead')
            .append('tr')
            .append('th')
            .attr('colspan', '6')
            .append('text')
            .attr('id', 'legend-title')
            .text('Total Cost For Each Segment');

        // Create one row per segment.
        const tr = legend
            .append('tbody')
            .selectAll('tr')
            .data(lD)
            .enter()
            .append('tr');

        // Create the first column for each segment.
        tr.append('td')
            .append('svg')
            .attr('width', '16')
            .attr('height', '16')
            .append('rect')
            .attr('width', '16')
            .attr('height', '16')
            .attr('fill', d => segColor(d.segment));

        // Create the second column for each segment.
        tr.append('td').text(d => d.segment);

        // Create the third column for each segment.
        tr.append('td')
            .attr('class', 'legendFreq')
            .text(d => locale.format('$,')(Math.round(d.price)));

        // Create the fourth column for each segment.
        tr.append('td')
            .attr('class', 'legendPerc')
            .text(d => getLegend(d, lD));

        const onchange = d => {
            const selectedIndex = d3.event.target.selectedIndex;
            const date = d3.event.target.dataset.date;
            for (let i in sData) {
                if (sData[i].name === d.segment) {
                    if (date === 'start' && selectedIndex <= sData[i].end)
                        sData[i].start = selectedIndex;

                    if (date === 'end' && selectedIndex >= sData[i].start)
                        sData[i].end = selectedIndex;

                    console.log(sData[i]);
                    break;
                }
            }

            fData = JSON.parse(JSON.stringify(sData));
            fData = d3.keys(MONTH_NAMES).map(s => {
                const prices = {};
                fData.forEach(t => {
                    const months = t.end - t.start + 1;
                    if (s == t.start && s == t.end) {
                        prices[t.name] = t.totalPrice;
                    } else if (months === 2) {
                        prices[t.name] =
                            s == t.start
                                ? t.totalPrice * 0.3
                                : s == t.end
                                    ? t.totalPrice * 0.7
                                    : 0;
                    } else {
                        const percentage = 0.8 / (months - 2); //Math.random();
                        prices[t.name] =
                            s == t.start
                                ? t.totalPrice * 0.1
                                : s > t.start && s < t.end
                                    ? t.totalPrice * percentage
                                    : s == t.end
                                        ? t.totalPrice
                                        : 0;
                        t.totalPrice -=
                            s == t.start
                                ? t.totalPrice * 0.1
                                : s > t.start && s < t.end
                                    ? t.totalPrice * percentage
                                    : 0;
                    }
                });

                return { month: MONTH_NAMES[s], prices };
            });

            // compute total for each month
            fData.forEach(d => {
                d.total = 0;
                for (let key in d.prices) {
                    d.total += d.prices[key];
                }
            });

            cF.update(
                fData.map(v => [v.month, v.total]),
                barColor,
                'All Segmentes'
            );
        };

        // Create form for start date selection
        tr.append('td')
            .append('form')
            .attr('class', 'form-inline')
            .append('select')
            .attr('class', 'custom-select my-0 mr-sm-2')
            .attr('data-date', 'start')
            .on('change', onchange)
            .selectAll('option')
            .data(MONTH_NAMES)
            .enter()
            .append('option')
            .text(d => d);

        // Create form for end date selection
        tr.append('td')
            .append('form')
            .attr('class', 'form-inline')
            .append('select')
            .attr('class', 'custom-select my-0 mr-sm-2')
            .attr('data-date', 'end')
            .on('change', onchange)
            .selectAll('option')
            .data(MONTH_NAMES)
            .enter()
            .append('option')
            .text(d => d);

        // Utility function to be used to update the leggend.
        leg.update = (nD, month) => {
            // Update the data attached to the row elements.
            const l = legend
                .select('tbody')
                .selectAll('tr')
                .data(nD);

            // Update the prices.
            l.select('.legendFreq').text(d =>
                locale.format('$,')(Math.round(d.price))
            );

            // Update the percentage column.
            l.select('.legendPerc').text(d => getLegend(d, nD));

            l.transition()
                .duration(300)
                .ease(d3.easeLinear)
                .style('display', 'table-row');

            l.filter(d => d.price === 0)
                .transition()
                .duration(300)
                .ease(d3.easeLinear)
                .style('display', 'none');

            // Update legend title
            legend
                .select('#legend-title')
                .text(`Total Cost For Each Segment ${month}`);
        };

        return leg;
    };

    const segments = [];
    fData.forEach(obj => {
        for (let key in obj.prices) {
            const index = segments.findIndex(name => name === key);
            if (index === -1) {
                segments.push(key);
            }
        }
    });

    const segColor = d3
        .scaleOrdinal()
        .domain(segments)
        .range(
            d3
                .quantize(
                    t => d3.interpolateSpectral(t * 0.8 + 0.1),
                    segments.length > 1 ? segments.length : 2
                )
                .reverse()
        );

    // Calculate total price by segment fol all state.
    const tP = segments.map(d => {
        return {
            segment: d,
            price: d3.sum(fData.map(t => t.prices[d])),
            start: fData.findIndex(s => s.prices[d] !== 0),
            end: 11 - fData.reverse().findIndex(s => s.prices[d] !== 0)
        };
    });

    // calculate total price by month for all segments.
    const pF = fData.map(d => [d.month, d.total]);

    const cF = costFlow(pF),
        pC = pieChart(tP),
        leg = legend(tP);
};

export { dashboard };
