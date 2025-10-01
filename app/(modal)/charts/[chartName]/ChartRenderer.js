'use client';

import { AllocationPieChart } from '@/components/AllocationPieChart';
import { ImprovementPieChart } from '@/components/ImprovementPieChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

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
            default:
                return <div>Unknown chart type</div>;
        }
    };

    return renderChart();
}
