'use client';

import { AllocationPieChart } from '@/components/AllocationPieChart';
import { ImprovementPieChart } from '@/components/ImprovementPieChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ScatterChart, Scatter, ZAxis, Label, Legend, Cell } from 'recharts';

const CustomLabel = (props) => {
    const { x, y, width, value } = props;
    if (value > 0) {
        return (
            <text x={x + width / 2} y={y} dy={-4} fill="#666" textAnchor="middle" fontSize={14} fontWeight="bold">
                {value}
            </text>
        );
    }
    return null;
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="custom-tooltip" style={{ backgroundColor: 'white', border: '1px solid #ccc', padding: '10px', zIndex: 1000, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 5px 0', color: '#36454F' }}>{`Site IMD Decile: ${data.siteImdDecile.toFixed(2)}`}</p>
                <p style={{ margin: '0 0 5px 0', color: '#36454F' }}>{`Allocation IMD Decile: ${data.allocationImdDecile.toFixed(2)}`}</p>
                <p style={{ margin: 0, color: '#36454F' }}>{`Count: ${data.count}`}</p>
            </div>
        );
    }
    return null;
};

const renderColorBarLegend = ({ chartProps, data }) => {
    const zAxis = chartProps.zAxis;
    if (!zAxis || !data || data.length === 0) return null;

    const counts = data.map(p => p.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    const minColor = getColorForCount(minCount, minCount, maxCount);
    const maxColor = getColorForCount(maxCount, minCount, maxCount);

    return (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#36454F', fontWeight: 'bold' }}>{zAxis.name}</h4>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#36454F', fontSize: '0.9rem' }}>{minCount}</span>
                <div style={{
                    width: '200px',
                    height: '20px',
                    background: `linear-gradient(to right, ${minColor}, ${maxColor})`,
                    border: '1px solid #ccc'
                }} />
                <span style={{ color: '#36454F', fontSize: '0.9rem' }}>{maxCount}</span>
            </div>
        </div>
    );
};

const getColorForCount = (count, minCount, maxCount) => {
    if (minCount === maxCount) {
        return '#40ae27ff'; // Return base green color if all counts are the same
    }
    // Scale lightness from 80% (light green) to 30% (dark green)
    const lightnessRange = [90, 10];
    const scale = (count - minCount) / (maxCount - minCount);
    const lightness = lightnessRange[0] - (scale * (lightnessRange[0] - lightnessRange[1]));
    
    // Using HSL color space for green (hue of ~145)
    return `hsl(145, 63%, ${lightness}%)`;
};


export default function ChartRenderer({ chartType, data, chartProps, title }) {
    const renderChart = () => {
        switch (chartType) {
            case 'AllocationPieChart':
                return <AllocationPieChart data={data} {...chartProps} />;
            case 'ImprovementPieChart':
                return <ImprovementPieChart data={data} {...chartProps} />;
            case 'BarChart':
                return (
                    <div style={{ width: '100%', height: '100%', border: '1px solid black', boxSizing: 'border-box' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 50, right: 30, left: 20, bottom: 15 }}>
                                <text x="50%" y="25" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '1.2rem', fontWeight: 'bold', fill: '#36454F' }}>{title}</text>
                                <XAxis dataKey="name" name="BGS IMD Decile Score" label={{ value: 'BGS IMD Decile Score', position: 'insideBottom', offset: -10, fill: '#36454F', fontWeight: 'bold', fontSize: '1.1rem' }} tick={{ fill: '#36454F' }} />
                                <YAxis tick={{ fill: '#36454F' }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#dcab1bff">
                                    <LabelList content={CustomLabel} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'ScatterChart':
                const counts = data.map(p => p.count);
                const minCount = Math.min(...counts);
                const maxCount = Math.max(...counts);

                // Add jitter to prevent overplotting of discrete data points
                const jitterAmount = 0.35;
                const jitteredData = data.map(point => ({
                    ...point,
                    siteImdDecile: point.siteImdDecile + (Math.random() - 0.5) * 2 * jitterAmount,
                    allocationImdDecile: point.allocationImdDecile + (Math.random() - 0.5) * 2 * jitterAmount,
                }));

                return (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {renderColorBarLegend({ chartProps, data })}
                        <div style={{ flex: 1, width: '100%', border: '1px solid black', boxSizing: 'border-box' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 40, right: 30, left: 20, bottom: 20 }} data={jitteredData}>
                                <text x="50%" y="15" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '1.2rem', fontWeight: 'bold', fill: '#36454F' }}>{title}</text>
                                <XAxis 
                                    type={chartProps.xAxis.type} 
                                    dataKey={chartProps.xAxis.dataKey} 
                                    name={chartProps.xAxis.name} 
                                    domain={chartProps.xAxis.domain}
                                    tickCount={12}
                                >
                                    <Label value={chartProps.xAxis.name} offset={-15} position="insideBottom" fill="#36454F" style={{ fontWeight: 'bold', fontSize: '1.1rem' }} />
                                </XAxis>
                                <YAxis type={chartProps.yAxis.type} dataKey={chartProps.yAxis.dataKey} name={chartProps.yAxis.name} domain={chartProps.yAxis.domain} tickCount={12} tick={{ fill: '#36454F' }}>
                                    <Label value={chartProps.yAxis.name} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontWeight: 'bold', fontSize: '1.1rem' }} fill="#36454F" />
                                </YAxis>
                                <ZAxis {...chartProps.zAxis} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                                <Scatter name="IMD Decile Pairs">
                                    {jitteredData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getColorForCount(entry.count, minCount, maxCount)} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                        </div>
                    </div>
                );
            default:
                return <div>Unknown chart type</div>;
        }
    };

    return renderChart();
}
