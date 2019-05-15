function mouseover(d) {
    console.log('The mouse is over the graph: ' + d);
}

function mouseout(d) {
    console.log('The mouse is out!');
}

export default function(data, key1, key2, chartTitle) {
    const width = 300,
        height = Math.min(width, 500);

    const pie = d3
        .pie()
        .sort(null)
        .value(d => d[key2]);

    const arcLabel = d3
        .arc()
        .outerRadius((Math.min(width, height) / 2) * 0.5)
        .innerRadius((Math.min(width, height) / 2) * 0.5);

    const arc = d3
        .arc()
        .outerRadius(Math.min(width, height) / 2 - 30)
        .innerRadius(0);

    const color = d3
        .scaleOrdinal()
        .domain(data.map(d => d[key1]))
        .range(
            d3
                .quantize(
                    t => d3.interpolateSpectral(t * 0.8 + 0.1),
                    data.length > 1 ? data.length : 2
                )
                .reverse()
        );

    const pieTween = b => {
        b.innerRadius = 0;
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, b);
        return t => arc(i(t));
    };

    const arcs = pie(data);

    const svg = d3
        .select('#charts')
        .append('svg')
        .attr('class', 'col')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('text-anchor', 'middle')
        .attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMinYMin')
        .style('font', '12px sans-serif');

    const g = svg.append('g');

    g.selectAll('path')
        .data(arcs)
        .enter()
        .append('path')
        .attr('fill', d => color(d.data[key1]))
        .attr('stroke', 'white')
        .attr('d', arc)
        .on('mouseover', mouseover)
        .transition()
        .ease(d3.easeLinear)
        .duration(2000)
        .attrTween('d', pieTween);

    g.selectAll('path')
        .append('title')
        .text(d => `${d.data[key1]}: ${d.data[key2]} €`);

    const text = g
        .selectAll('text')
        .data(arcs)
        .enter()
        .append('text')
        .attr('transform', d => `translate(${arcLabel.centroid(d)})`);

    text.append('tspan')
        .attr('x', 0)
        .attr('y', '-0.7em')
        .style('font-weight', 'bold')
        .text(d => d.data[key1]);

    text.filter(d => d.endAngle - d.startAngle > 0.25)
        .append('tspan')
        .attr('x', 0)
        .attr('y', '0.7em')
        .attr('fill-opacity', 0.7)
        .text(d => `${d.data[key2]} €`);

    svg.append('text')
        .attr('x', 0)
        .attr('y', height / 2 - 10)
        .attr('class', 'h5')
        .text(chartTitle);

    return svg.node();
}
