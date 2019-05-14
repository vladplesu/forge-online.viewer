export default function(data) {
    const width = 400,
        height = Math.min(width, 500);

    const pie = d3
        .pie()
        .sort(null)
        .value(d => d.volume);

    const arcLabel = d3
        .arc()
        .outerRadius((Math.min(width, height) / 2) * 0.8)
        .innerRadius((Math.min(width, height) / 2) * 0.8);

    const arc = d3
        .arc()
        .outerRadius(Math.min(width, height) / 2 - 1)
        .innerRadius(0);

    const color = d3
        .scaleOrdinal()
        .domain(data.map(d => d.segment))
        .range(
            d3
                .quantize(
                    t => d3.interpolateSpectral(t * 0.8 + 0.1),
                    data.length
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
        .attr('width', width)
        .attr('height', height)
        .attr('text-anchor', 'middle')
        .style('font', '12px sans-serif');

    const g = svg
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    g.selectAll('path')
        .data(arcs)
        .enter()
        .append('path')
        .attr('fill', d => color(d.data.segment))
        .attr('stroke', 'white')
        .attr('d', arc)
        .transition()
        .ease(d3.easeLinear)
        .duration(2000)
        .attrTween('d', pieTween);

    g.selectAll('path')
        .append('title')
        .text(
            d => `${d.data.segment}: ${Math.round(d.data.volume * 100) / 100}`
        );

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
        .text(d => d.data.segment);

    text.filter(d => d.endAngle - d.startAngle > 0.25)
        .append('tspan')
        .attr('x', 0)
        .attr('y', '0.7em')
        .attr('fill-opacity', 0.7)
        .text(d => Math.round(d.data.volume * 100) / 100);

    return svg.node();
}
