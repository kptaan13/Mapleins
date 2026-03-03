export type Job = {
  id: string;
  title: string;
  company: string;
  url: string;
  location: string;
  category: string;
};

export const JOBS_BY_CATEGORY: Record<string, Job[]> = {
  Warehouse: [
    { id: "w1", title: "Warehouse Associate", company: "Walmart", url: "https://walmart.ca/careers", location: "Saskatoon", category: "Warehouse" },
    { id: "w2", title: "Order Picker", company: "Amazon", url: "https://amazon.jobs", location: "Toronto", category: "Warehouse" },
    { id: "w3", title: "Forklift Operator", company: "Canadian Tire", url: "https://canadiantire.ca/careers", location: "Prince Albert", category: "Warehouse" },
    { id: "w4", title: "Inventory Associate", company: "Costco", url: "https://costco.ca/careers", location: "Vancouver", category: "Warehouse" },
    { id: "w5", title: "Warehouse Labourer", company: "Home Depot", url: "https://careers.homedepot.ca", location: "Saskatoon", category: "Warehouse" },
    { id: "w6", title: "Shipping Clerk", company: "Loblaws", url: "https://loblaw.ca/careers", location: "Toronto", category: "Warehouse" },
    { id: "w7", title: "Receiving Associate", company: "Sobeys", url: "https://sobeys.com/careers", location: "Prince Albert", category: "Warehouse" },
    { id: "w8", title: "Distribution Associate", company: "FedEx", url: "https://fedex.com/ca/careers", location: "Vancouver", category: "Warehouse" },
    { id: "w9", title: "Stock Handler", company: "Canadian Tire", url: "https://canadiantire.ca/careers", location: "Toronto", category: "Warehouse" },
    { id: "w10", title: "Warehouse Team Member", company: "Tim Hortons Distribution", url: "https://timhortons.ca/careers", location: "Saskatoon", category: "Warehouse" },
    { id: "w11", title: "Material Handler", company: "Purolator", url: "https://purolator.com/careers", location: "Vancouver", category: "Warehouse" },
    { id: "w12", title: "Warehouse Associate", company: "Best Buy", url: "https://bestbuy.ca/careers", location: "Toronto", category: "Warehouse" },
    { id: "w13", title: "Packaging Associate", company: "Walmart", url: "https://walmart.ca/careers", location: "Prince Albert", category: "Warehouse" },
    { id: "w14", title: "Logistics Associate", company: "Dollarama", url: "https://dollarama.com/careers", location: "Saskatoon", category: "Warehouse" },
    { id: "w15", title: "Warehouse Worker", company: "Metro", url: "https://metro.ca/careers", location: "Vancouver", category: "Warehouse" },
  ],
  Trucking: [
    { id: "t1", title: "Class 1 Driver", company: "Bison Transport", url: "https://bisontransport.com/careers", location: "Saskatoon", category: "Trucking" },
    { id: "t2", title: "Local Delivery Driver", company: "FedEx Ground", url: "https://fedex.com/ca/careers", location: "Toronto", category: "Trucking" },
    { id: "t3", title: "Long Haul Truck Driver", company: "TransX", url: "https://transx.com/careers", location: "Vancouver", category: "Trucking" },
    { id: "t4", title: "Class 5 Delivery Driver", company: "Amazon", url: "https://amazon.jobs", location: "Prince Albert", category: "Trucking" },
    { id: "t5", title: "Transport Driver", company: "Canadian Tire", url: "https://canadiantire.ca/careers", location: "Saskatoon", category: "Trucking" },
    { id: "t6", title: "Pickup and Delivery Driver", company: "Purolator", url: "https://purolator.com/careers", location: "Toronto", category: "Trucking" },
    { id: "t7", title: "Flatbed Driver", company: "Mullen Group", url: "https://mullengroup.com/careers", location: "Vancouver", category: "Trucking" },
    { id: "t8", title: "Reefer Driver", company: "TFI International", url: "https://tfiintl.com/careers", location: "Saskatoon", category: "Trucking" },
    { id: "t9", title: "City Driver", company: "Loblaws", url: "https://loblaw.ca/careers", location: "Toronto", category: "Trucking" },
    { id: "t10", title: "Delivery Driver", company: "UPS", url: "https://ups.com/ca/careers", location: "Prince Albert", category: "Trucking" },
    { id: "t11", title: "Class 3 Driver", company: "Sobeys", url: "https://sobeys.com/careers", location: "Vancouver", category: "Trucking" },
    { id: "t12", title: "Owner Operator", company: "Bison Transport", url: "https://bisontransport.com/careers", location: "Saskatoon", category: "Trucking" },
    { id: "t13", title: "Tanker Driver", company: "Trimac", url: "https://trimac.com/careers", location: "Toronto", category: "Trucking" },
    { id: "t14", title: "LTL Driver", company: "Day & Ross", url: "https://dayandross.com/careers", location: "Vancouver", category: "Trucking" },
    { id: "t15", title: "Distribution Driver", company: "Walmart", url: "https://walmart.ca/careers", location: "Prince Albert", category: "Trucking" },
  ],
  Retail: [
    { id: "r1", title: "Sales Associate", company: "Walmart", url: "https://walmart.ca/careers", location: "Saskatoon", category: "Retail" },
    { id: "r2", title: "Team Member", company: "Tim Hortons", url: "https://timhortons.ca/careers", location: "Prince Albert", category: "Retail" },
    { id: "r3", title: "Retail Associate", company: "Canadian Tire", url: "https://canadiantire.ca/careers", location: "Toronto", category: "Retail" },
    { id: "r4", title: "Cashier", company: "Costco", url: "https://costco.ca/careers", location: "Vancouver", category: "Retail" },
    { id: "r5", title: "Store Associate", company: "Dollarama", url: "https://dollarama.com/careers", location: "Saskatoon", category: "Retail" },
    { id: "r6", title: "Sales Representative", company: "Best Buy", url: "https://bestbuy.ca/careers", location: "Toronto", category: "Retail" },
    { id: "r7", title: "Retail Sales Associate", company: "Home Depot", url: "https://careers.homedepot.ca", location: "Prince Albert", category: "Retail" },
    { id: "r8", title: "Customer Service Associate", company: "Shoppers Drug Mart", url: "https://shoppersdrugmart.ca/careers", location: "Vancouver", category: "Retail" },
    { id: "r9", title: "Stock Associate", company: "Walmart", url: "https://walmart.ca/careers", location: "Saskatoon", category: "Retail" },
    { id: "r10", title: "Barista", company: "Starbucks", url: "https://starbucks.ca/careers", location: "Toronto", category: "Retail" },
    { id: "r11", title: "Retail Team Member", company: "McDonald's", url: "https://mcdonalds.ca/careers", location: "Vancouver", category: "Retail" },
    { id: "r12", title: "Sales Associate", company: "Sport Chek", url: "https://sportchek.ca/careers", location: "Prince Albert", category: "Retail" },
    { id: "r13", title: "Store Associate", company: "Giant Tiger", url: "https://gianttiger.com/careers", location: "Saskatoon", category: "Retail" },
    { id: "r14", title: "Retail Associate", company: "Loblaws", url: "https://loblaw.ca/careers", location: "Toronto", category: "Retail" },
    { id: "r15", title: "Customer Experience Associate", company: "IKEA", url: "https://ikea.com/ca/careers", location: "Vancouver", category: "Retail" },
  ],
  IT: [
    { id: "i1", title: "Software Developer", company: "Shopify", url: "https://shopify.com/careers", location: "Toronto", category: "IT" },
    { id: "i2", title: "IT Support Specialist", company: "Rogers", url: "https://rogers.com/careers", location: "Vancouver", category: "IT" },
    { id: "i3", title: "Junior Developer", company: "TD Bank", url: "https://td.com/careers", location: "Toronto", category: "IT" },
    { id: "i4", title: "Help Desk Technician", company: "Bell", url: "https://bell.ca/careers", location: "Saskatoon", category: "IT" },
    { id: "i5", title: "Data Analyst", company: "RBC", url: "https://rbc.com/careers", location: "Toronto", category: "IT" },
    { id: "i6", title: "System Administrator", company: "SaskTel", url: "https://sasktel.com/careers", location: "Saskatoon", category: "IT" },
    { id: "i7", title: "Frontend Developer", company: "Hootsuite", url: "https://hootsuite.com/careers", location: "Vancouver", category: "IT" },
    { id: "i8", title: "IT Technician", company: "Canadian Tire", url: "https://canadiantire.ca/careers", location: "Prince Albert", category: "IT" },
    { id: "i9", title: "QA Analyst", company: "Lightspeed", url: "https://lightspeed.com/careers", location: "Toronto", category: "IT" },
    { id: "i10", title: "DevOps Engineer", company: "Slack", url: "https://slack.com/careers", location: "Vancouver", category: "IT" },
    { id: "i11", title: "Network Technician", company: "TELUS", url: "https://telus.com/careers", location: "Saskatoon", category: "IT" },
    { id: "i12", title: "Full Stack Developer", company: "Wealthsimple", url: "https://wealthsimple.com/careers", location: "Toronto", category: "IT" },
    { id: "i13", title: "IT Support", company: "Walmart", url: "https://walmart.ca/careers", location: "Vancouver", category: "IT" },
    { id: "i14", title: "Software Engineer", company: "Amazon", url: "https://amazon.jobs", location: "Toronto", category: "IT" },
    { id: "i15", title: "Technical Support", company: "Microsoft", url: "https://microsoft.com/careers", location: "Vancouver", category: "IT" },
  ],
  Healthcare: [
    { id: "h1", title: "Personal Support Worker", company: "Chartwell", url: "https://chartwell.com/careers", location: "Toronto", category: "Healthcare" },
    { id: "h2", title: "Care Aide", company: "Sienna Senior Living", url: "https://siennaliving.ca/careers", location: "Vancouver", category: "Healthcare" },
    { id: "h3", title: "Healthcare Aide", company: "Saskatoon Health Region", url: "https://saskatoonhealthregion.ca/careers", location: "Saskatoon", category: "Healthcare" },
    { id: "h4", title: "Nursing Assistant", company: "Extendicare", url: "https://extendicare.com/careers", location: "Prince Albert", category: "Healthcare" },
    { id: "h5", title: "Medical Office Assistant", company: "LifeLabs", url: "https://lifelabs.com/careers", location: "Toronto", category: "Healthcare" },
    { id: "h6", title: "Receptionist", company: "Shoppers Drug Mart", url: "https://shoppersdrugmart.ca/careers", location: "Vancouver", category: "Healthcare" },
    { id: "h7", title: "Care Worker", company: "Bayshore HealthCare", url: "https://bayshore.ca/careers", location: "Saskatoon", category: "Healthcare" },
    { id: "h8", title: "PSW", company: "Revera", url: "https://revera.com/careers", location: "Toronto", category: "Healthcare" },
    { id: "h9", title: "Health Care Aide", company: "CBI Health", url: "https://cbi.ca/careers", location: "Prince Albert", category: "Healthcare" },
    { id: "h10", title: "Patient Care Assistant", company: "Vancouver Coastal Health", url: "https://vch.ca/careers", location: "Vancouver", category: "Healthcare" },
    { id: "h11", title: "Support Worker", company: "VON Canada", url: "https://von.ca/careers", location: "Saskatoon", category: "Healthcare" },
    { id: "h12", title: "Medical Admin", company: "Dynacare", url: "https://dynacare.ca/careers", location: "Toronto", category: "Healthcare" },
    { id: "h13", title: "Care Attendant", company: "Sienna Senior Living", url: "https://siennaliving.ca/careers", location: "Vancouver", category: "Healthcare" },
    { id: "h14", title: "Healthcare Assistant", company: "Saskatchewan Health Authority", url: "https://saskhealthauthority.ca/careers", location: "Prince Albert", category: "Healthcare" },
    { id: "h15", title: "Patient Services", company: "LifeLabs", url: "https://lifelabs.com/careers", location: "Saskatoon", category: "Healthcare" },
  ],
};

export function getJobsForCategory(jobType: string, city?: string): Job[] {
  const jobs = JOBS_BY_CATEGORY[jobType] || JOBS_BY_CATEGORY["Retail"];
  if (city) {
    const inCity = jobs.filter((j) => j.location === city);
    const rest = jobs.filter((j) => j.location !== city);
    return [...inCity, ...rest].slice(0, 15);
  }
  return jobs.slice(0, 15);
}
