const gamma = 0.1;
const delta_t = 1;

function simulate_trajectory(length, num){  
  const p_zero = gamma * delta_t;
  let trajectories = Array.from({length: length}, () => new Array(num).fill(0));

  // initialization
  trajectories[0].fill(1.)

  for (let n=0; n < length - 1; n++){
	let current = trajectories[n];
    let next = trajectories[n + 1];
    for (let i=0; i < num; i++){
		  let r_n = Math.random();
	    if (r_n > p_zero) {
			  next[i] = current[i];
	    } else {
			  next[i] = 0.;
	    }
	  }
  }

  let average = trajectories.map((row) => row.reduce((a, c) => a + c) / row.length);
  let example_trajectory = trajectories.map((row) => row[0])
  return {
	  trajectory: example_trajectory,
	  average: average
  }
}

function get_times(length){
	let times = Array(length).fill(0).map((x, i) => delta_t * i);
	return times;
}

function exact_solution(times){
	let y = times.map((t) => Math.exp(- gamma * t))
	return y;
}

function merge_times(a, times){
	let data = times.map((t, i) => [t, a[i]])
	return data
}

let myChart = echarts.init(document.getElementById('figureWrapper'), null, { renderer: 'svg' });

// Specify the configuration items and data for the chart
let option = {
  animation: false,
  xAxis: {
    name: 't',
    nameLocation: 'center',
    nameTextStyle: {
      fontSize: 16,
      color: '#d8d8d8'
    },
    axisLine: {
      lineStyle: {
        color: '#d8d8d8'
      }
    }
  },
  yAxis: {
    name: 'x',
    nameLocation: 'center',
    nameRotate: 0,
    nameGap: 20,
    nameTextStyle: {
      fontSize: 16,
      color: '#d8d8d8'
    },
    axisLine: {
      lineStyle: {
        color: '#d8d8d8'
      }
    }
  },
  legend: {
    orient: 'vertical',
    top: 'center',
    right: '0',
    textStyle: {
      color: '#d8d8d8'
    }
  },
  tooltip: {
    trigger: 'item'
  },
  series: [
    {
      name: 'trajectory',
      type: 'line'
    },
    {
      name: 'average',
      type: 'line'
    },
    {
      name: 'exact',
      type: 'line',
      showSymbol: false
    },
  ]
};

// Display the chart using the configuration items and data just specified.
myChart.setOption(option);

function initialize(){
  const num = parseInt(document.getElementById("traj_inp").value)
  const length = parseInt(document.getElementById("steps_inp").value)

  const times = get_times(length);
  let exact = exact_solution(times);

  const simulation_result = simulate_trajectory(length, num);
  let trajectory = simulation_result.trajectory;
  let average = simulation_result.average;

  exact = merge_times(exact, times);
  trajectory = merge_times(trajectory, times);
  average = merge_times(average, times);

  let option = {
    series: [
      {
        name: 'trajectory',
        type: 'line',
        data: trajectory
      },
      {
        name: 'average',
        type: 'line',
        data: average
      },
      {
        name: 'exact',
        type: 'line',
        showSymbol: false,
        data: exact
      },
    ]
  };

  myChart.setOption(option);
}

let start_btn = document.getElementById("start");
start_btn.addEventListener("click", () => {
  initialize();
});

window.addEventListener('resize', function() {
  myChart.resize();
});

initialize();