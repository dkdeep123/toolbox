const tools=[
{id:"age",name:"Age Calculator",icon:"🎂",cat:"utility",desc:"Calculate your exact age from your date of birth."},
{id:"emi",name:"EMI Calculator",icon:"💰",cat:"finance",desc:"Calculate monthly EMI, interest and total payment."},
{id:"percentage",name:"Percentage Calculator",icon:"％",cat:"math",desc:"Find percentage, increase and decrease quickly."},
{id:"gst",name:"GST Calculator",icon:"🧾",cat:"finance",desc:"Add or remove GST from any amount."},
{id:"unit",name:"Unit Converter",icon:"📏",cat:"utility",desc:"Convert length, weight and temperature."},
{id:"bmi",name:"BMI Calculator",icon:"⚖️",cat:"utility",desc:"Check BMI using your height and weight."},
{id:"discount",name:"Discount Calculator",icon:"🏷️",cat:"finance",desc:"Calculate sale price and savings."},
{id:"tip",name:"Tip Calculator",icon:"🍽️",cat:"finance",desc:"Calculate tip and split a bill."},
{id:"ratio",name:"Ratio Calculator",icon:"🔢",cat:"math",desc:"Simplify and calculate ratios."},
{id:"number",name:"Number Converter",icon:"🔁",cat:"math",desc:"Convert numbers between common formats."},
{id:"date",name:"Date Difference",icon:"📅",cat:"utility",desc:"Find the number of days between dates."},
{id:"salary",name:"Salary Calculator",icon:"💵",cat:"finance",desc:"Estimate monthly and annual salary."}
];
const grid=document.getElementById("grid"),search=document.getElementById("search"),count=document.getElementById("count"),empty=document.getElementById("empty");
let category="all";
function render(){let q=search.value.toLowerCase();let list=tools.filter(t=>(category==="all"||t.cat===category)&&(t.name+" "+t.desc).toLowerCase().includes(q));grid.innerHTML=list.map(t=>`<article class="tool" onclick="openTool('${t.id}')"><div class="tool-icon">${t.icon}</div><h3>${t.name}</h3><p>${t.desc}</p></article>`).join("");count.textContent=`${list.length} tool${list.length!==1?"s":""}`;empty.classList.toggle("hidden",list.length>0)}
search.addEventListener("input",render);document.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");category=b.dataset.cat;render()});
document.querySelectorAll(".quick button").forEach(b=>b.onclick=()=>{search.value=b.dataset.query;document.getElementById("tools").scrollIntoView();render()});
document.getElementById("theme").onclick=()=>{document.body.classList.toggle("dark");document.getElementById("theme").textContent=document.body.classList.contains("dark")?"☀":"☾"};
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();search.focus()}});
const modal=document.getElementById("modal"),content=document.getElementById("toolContent");document.getElementById("close").onclick=()=>modal.classList.add("hidden");modal.onclick=e=>{if(e.target===modal)modal.classList.add("hidden")};
function openTool(id){const t=tools.find(x=>x.id===id);const forms={
age:`<h2>🎂 Age Calculator</h2><p>Enter your date of birth.</p><div class="form"><label>Date of birth</label><input id="dob" type="date"/><button class="primary" onclick="calcAge()">Calculate</button><div id="res" class="result hidden"></div></div>`,
emi:`<h2>💰 EMI Calculator</h2><div class="form"><label>Loan amount (₹)</label><input id="loan" type="number" placeholder="500000"/><label>Annual interest (%)</label><input id="rate" type="number" step=".1" placeholder="8.5"/><label>Tenure (years)</label><input id="years" type="number" placeholder="5"/><button class="primary" onclick="calcEmi()">Calculate EMI</button><div id="res" class="result hidden"></div></div>`,
percentage:`<h2>％ Percentage Calculator</h2><div class="form"><label>What is X% of Y?</label><input id="x" type="number" placeholder="20"/><input id="y" type="number" placeholder="500"/><button class="primary" onclick="calcPct()">Calculate</button><div id="res" class="result hidden"></div></div>`,
gst:`<h2>🧾 GST Calculator</h2><div class="form"><label>Amount (₹)</label><input id="amount" type="number" placeholder="1000"/><label>GST rate (%)</label><input id="gst" type="number" value="18"/><button class="primary" onclick="calcGst()">Calculate</button><div id="res" class="result hidden"></div></div>`,
bmi:`<h2>⚖️ BMI Calculator</h2><div class="form"><label>Weight (kg)</label><input id="weight" type="number" placeholder="60"/><label>Height (cm)</label><input id="height" type="number" placeholder="170"/><button class="primary" onclick="calcBmi()">Calculate</button><div id="res" class="result hidden"></div></div>`,
discount:`<h2>🏷️ Discount Calculator</h2><div class="form"><label>Original price (₹)</label><input id="price" type="number" placeholder="2000"/><label>Discount (%)</label><input id="disc" type="number" placeholder="20"/><button class="primary" onclick="calcDiscount()">Calculate</button><div id="res" class="result hidden"></div></div>`,
tip:`<h2>🍽️ Tip Calculator</h2><div class="form"><label>Bill (₹)</label><input id="bill" type="number" placeholder="1000"/><label>Tip (%)</label><input id="tiprate" type="number" value="10"/><label>People</label><input id="people" type="number" value="1"/><button class="primary" onclick="calcTip()">Calculate</button><div id="res" class="result hidden"></div></div>`,
unit:`<h2>📏 Unit Converter</h2><div class="form"><label>Meters</label><input id="meters" type="number" placeholder="10"/><button class="primary" onclick="calcUnit()">Convert</button><div id="res" class="result hidden"></div></div>`,
ratio:`<h2>🔢 Ratio Calculator</h2><div class="form"><label>First number</label><input id="a" type="number" placeholder="20"/><label>Second number</label><input id="b" type="number" placeholder="30"/><button class="primary" onclick="calcRatio()">Simplify</button><div id="res" class="result hidden"></div></div>`,
number:`<h2>🔁 Number Converter</h2><div class="form"><label>Decimal number</label><input id="num" type="number" placeholder="42"/><button class="primary" onclick="calcNumber()">Convert</button><div id="res" class="result hidden"></div></div>`,
date:`<h2>📅 Date Difference</h2><div class="form"><label>Start date</label><input id="d1" type="date"/><label>End date</label><input id="d2" type="date"/><button class="primary" onclick="calcDate()">Calculate</button><div id="res" class="result hidden"></div></div>`,
salary:`<h2>💵 Salary Calculator</h2><div class="form"><label>Annual CTC (₹)</label><input id="ctc" type="number" placeholder="600000"/><button class="primary" onclick="calcSalary()">Calculate</button><div id="res" class="result hidden"></div></div>`
};content.innerHTML=forms[id]||`<h2>${t.name}</h2><p>This tool is coming soon.</p>`;modal.classList.remove("hidden")}
function show(v){let r=document.getElementById("res");r.innerHTML=v;r.classList.remove("hidden")}
function calcAge(){let d=new Date(dob.value);if(isNaN(d))return show("Please select a date.");let n=new Date(),age=n.getFullYear()-d.getFullYear();if(new Date(n.getFullYear(),d.getMonth(),d.getDate())>n)age--;show(`${age} years old`)}
function calcEmi(){let p=+loan.value,r=+rate.value/1200,n=+years.value*12;if(!p||!n)return;let m=p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);show(`₹${m.toFixed(0)} / month<br><small>Total: ₹${(m*n).toFixed(0)}</small>`)}
function calcPct(){show(`${((+x.value*+y.value)/100).toFixed(2)}`)}
function calcGst(){let a=+amount.value,g=+gst.value,t=a*g/100;show(`GST: ₹${t.toFixed(2)}<br><small>Total: ₹${(a+t).toFixed(2)}</small>`)}
function calcBmi(){let v=+weight.value/(+height.value/100)**2;show(`BMI ${v.toFixed(1)}<br><small>${v<18.5?"Underweight":v<25?"Normal":"Above normal"}</small>`)}
function calcDiscount(){let p=+price.value,d=+disc.value,s=p*d/100;show(`Pay ₹${(p-s).toFixed(2)}<br><small>You save ₹${s.toFixed(2)}</small>`)}
function calcTip(){let b=+bill.value,t=b*+tiprate.value/100,n=+people.value||1;show(`Tip ₹${t.toFixed(2)}<br><small>₹${((b+t)/n).toFixed(2)} per person</small>`)}
function calcUnit(){let m=+meters.value;show(`${m} m = ${(m*3.28084).toFixed(3)} ft<br><small>${(m*100).toFixed(0)} cm</small>`)}
function gcd(a,b){while(b){[a,b]=[b,a%b]}return Math.abs(a)}
function calcRatio(){let a=+document.getElementById("a").value,b=+document.getElementById("b").value,g=gcd(a,b);show(`${a/g} : ${b/g}`)}
function calcNumber(){let n=+num.value;show(`Binary: ${n.toString(2)}<br><small>Hex: ${n.toString(16).toUpperCase()}</small>`)}
function calcDate(){let a=new Date(d1.value),b=new Date(d2.value);show(`${Math.abs(Math.round((b-a)/86400000))} days`)}
function calcSalary(){let c=+ctc.value;show(`₹${(c/12).toFixed(0)} / month<br><small>₹${c.toLocaleString("en-IN")} annual CTC</small>`)}
render();