'use client';

import { AllocationPieChart } from '@/components/AllocationPieChart';
import { ImprovementPieChart } from '@/components/ImprovementPieChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ScatterChart, Scatter, ZAxis, Label } from 'recharts';

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
            <div className="custom-tooltip" style={{ backgroundColor: '#fff', border: '1px solid #ccc', padding: '10px' }}>
                <p>{`Site IMD Decile: ${data.siteImdDecile}`}</p>
                <p>{`Allocation IMD Decile: ${data.allocationImdDecile}`}</p>
                <p>{`Count: ${data.count}`}</p>
            </div>
        );
    }
    return null;
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
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 40, right: 30, left: 20, bottom: 15 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" name="BGS IMD Decile Score" label={{ value: 'BGS IMD Decile Score', position: 'insideBottom', offset: -10 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#dcab1bff">
                                <LabelList content={CustomLabel} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'ScatterChart':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 40, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid />
                            <XAxis 
                                type={chartProps.xAxis.type} 
                                dataKey={chartProps.xAxis.dataKey} 
                                name={chartProps.xAxis.name} 
                                domain={chartProps.xAxis.domain}
                                tickCount={12}
                            >
                                <Label value={chartProps.xAxis.name} offset={-15} position="insideBottom" />
                            </XAxis>
                            <YAxis type={chartProps.yAxis.type} dataKey={chartProps.yAxis.dataKey} name={chartProps.yAxis.name} domain={chartProps.yAxis.domain} tickCount={12}>
                                <Label value={chartProps.yAxis.name} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                            </YAxis>
                            <ZAxis {...chartProps.zAxis} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                            <Scatter name="IMD Decile Pairs" data={data} fill="#dcab1bff" />
                        </ScatterChart>
                    </ResponsiveContainer>
                );
            default:
                return <div>Unknown chart type</div>;
        }
    };

    return renderChart();
}
