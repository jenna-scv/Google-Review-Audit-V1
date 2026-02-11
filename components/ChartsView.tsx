
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { AppData } from '../types';

interface ChartsViewProps {
  data: AppData;
  id?: string;
}

const COLORS = ['#424143', '#5f6b7c', '#89a6aa', '#1f313b', '#e57a3a']; 

export const ChartsView: React.FC<ChartsViewProps> = ({ data, id }) => {
  return (
    <div id={id || "charts-container"} className="bg-white p-10 space-y-16">
      {/* Quarter vs Yearly Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Row 1: Volume */}
        <div id="quarterly-volume-chart-wrapper" className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold text-brindle-dark">Quarterly Review Volume</h3>
            <p className="text-sm text-gray-500">Reviews per quarter in {data.year}</p>
          </div>
          <div className="h-64 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.metrics.quarterlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#424143" tick={{fill: '#424143', fontSize: 12}} />
                <YAxis allowDecimals={false} stroke="#424143" tick={{fill: '#424143', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}} 
                  contentStyle={{ borderColor: '#e57a3a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="reviewCount" fill="#1f313b" radius={[4, 4, 0, 0]} name="Reviews" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div id="yearly-growth-chart-wrapper" className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold text-brindle-dark">Yearly Review Growth</h3>
            <p className="text-sm text-gray-500">Historical review volume totals</p>
          </div>
          <div className="h-64 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.metrics.yearlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="year" stroke="#424143" tick={{fill: '#424143', fontSize: 12}} />
                <YAxis allowDecimals={false} stroke="#424143" tick={{fill: '#424143', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}} 
                  contentStyle={{ borderColor: '#89a6aa', borderRadius: '8px' }} 
                />
                <Bar dataKey="reviewCount" fill="#e57a3a" radius={[4, 4, 0, 0]} name="Total Reviews" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Rating Trends */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold text-brindle-dark">Quarterly Rating Trend</h3>
            <p className="text-sm text-gray-500">Avg. star rating performance</p>
          </div>
          <div className="h-64 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.metrics.quarterlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#424143" tick={{fill: '#424143'}} />
                <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} stroke="#424143" tick={{fill: '#424143'}} />
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                <Line type="monotone" dataKey="averageRating" stroke="#e57a3a" strokeWidth={4} dot={{r: 6, fill: '#1f313b', strokeWidth: 2, stroke: '#fff'}} activeDot={{ r: 8 }} name="Avg Rating" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold text-brindle-dark">Yearly Rating Stability</h3>
            <p className="text-sm text-gray-500">Long-term reputation trajectory</p>
          </div>
          <div className="h-64 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.metrics.yearlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="year" stroke="#424143" tick={{fill: '#424143'}} />
                <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} stroke="#424143" tick={{fill: '#424143'}} />
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                <Line type="monotone" dataKey="averageRating" stroke="#1f313b" strokeWidth={4} dot={{r: 6, fill: '#e57a3a', strokeWidth: 2, stroke: '#fff'}} name="Avg Rating" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribution & Key Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8">
        <div className="bg-gray-50/50 p-8 rounded-2xl border border-gray-100">
           <h3 className="text-lg font-bold text-brindle-dark mb-6 text-center">YTD Star Rating Distribution</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={data.metrics.distribution}
                   cx="50%" cy="50%"
                   innerRadius={60} outerRadius={85}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {data.metrics.distribution.map((_entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
                 <Legend verticalAlign="bottom" align="center" iconType="circle" />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div id="key-stats-widget-wrapper" className="flex flex-col justify-center items-center space-y-8 bg-brindle-dark text-white rounded-2xl p-8 shadow-xl">
             <div className="text-center">
                 <p className="text-sm text-brindle-muted uppercase tracking-widest font-bold">YTD Overall Average</p>
                 <p className="text-7xl font-bold mt-2 text-brindle-orange">{data.metrics.ytdAvg.toFixed(2)}</p>
             </div>
             <div className="w-24 h-1 bg-white/20 rounded"></div>
             <div className="text-center">
                 <p className="text-sm text-brindle-muted uppercase tracking-widest font-bold">Cumulative Reviews</p>
                 <p className="text-5xl font-bold mt-2">{data.metrics.allTimeTotal}</p>
             </div>
        </div>
      </div>
    </div>
  );
};
