import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({ user:vi.fn(),entitlements:vi.fn(),create:vi.fn(),source:vi.fn(),find:vi.fn(),list:vi.fn(),sources:vi.fn() }));
vi.mock('../../src/server/auth/session',()=>({requireUserId:mocks.user}));
vi.mock('../../src/server/services/entitlement.service',()=>({getUserEntitlements:mocks.entitlements}));
vi.mock('../../src/server/repositories/measurement.repository', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/server/repositories/measurement.repository')>(),
  createEnergyMeasurementForUser:mocks.create,createMeasurementSourceForUser:mocks.source,
  findEnergyMeasurementForUser:mocks.find,listEnergyMeasurementsForUser:mocks.list,listMeasurementSourcesForUser:mocks.sources,
}));
import { createEnergyMeasurement,createMeasurementSource,getEnergyMeasurement,listEnergyMeasurements,listMeasurementSources } from '../../src/server/services/measurement.service';

const valid={businessId:'b',measurementSourceId:'s',periodStart:'2026-01-01T00:00:00Z',periodEnd:'2026-01-02T00:00:00Z',sourceTimezone:'UTC',energyKwh:'1',unit:'kWh',measurementKind:'INTERVAL_ENERGY',measurementMethod:'MANUAL',consumptionBasis:'MEASURED',qualityStatus:'RECORDED',provenanceReference:'log'};
describe('Phase01 authenticated service',()=>{
  beforeEach(()=>{
    vi.resetAllMocks();mocks.user.mockResolvedValue('session-user');
    vi.stubEnv('NODE_ENV','test');
    for (const key of ['VERCEL','VERCEL_ENV','VERCEL_TARGET_ENV','MEASUREMENT_WRITE_ENABLED','MEASUREMENT_PILOT_ALLOWLIST']) vi.stubEnv(key,undefined);
  });
  afterEach(()=>vi.unstubAllEnvs());
  it('denies unauthenticated operations before repository access',async()=>{
    mocks.user.mockRejectedValue(new Error('UNAUTHENTICATED'));
    for (const result of [await createEnergyMeasurement(valid),await createMeasurementSource({}),await getEnergyMeasurement('m'),await listEnergyMeasurements({businessId:'b'}),await listMeasurementSources('b')]) {
      expect(result).toMatchObject({ok:false,error:{code:'UNAUTHENTICATED'}});
    }
    expect(mocks.create).not.toHaveBeenCalled();expect(mocks.find).not.toHaveBeenCalled();
  });
  it.each(['FREE','TRIAL','PRO','BUSINESS'])('fails closed for %s without invented quota/billing bypass',async plan=>{
    mocks.entitlements.mockResolvedValue({plan,limits:{maxElectricityEntries:plan==='FREE'?3:null}});
    expect(await createEnergyMeasurement(valid)).toMatchObject({ok:false,error:{code:'MEASUREMENT_WRITE_DENIED'}});
    expect(await createMeasurementSource({businessId:'b',name:'Meter',sourceType:'METER',measurementBoundary:'WHOLE_SITE',provenanceKey:'meter'})).toMatchObject({ok:false,error:{code:'MEASUREMENT_WRITE_DENIED'}});
    expect(mocks.create).not.toHaveBeenCalled();expect(mocks.source).not.toHaveBeenCalled();
    expect(mocks.entitlements).not.toHaveBeenCalled();
  });
  it.each(['FREE','TRIAL','PRO','BUSINESS'])('allows approved pair independently of %s bill quotas',async plan=>{
    mocks.entitlements.mockResolvedValue({plan,limits:{maxElectricityEntries:0}});
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED','true');
    vi.stubEnv('MEASUREMENT_PILOT_ALLOWLIST','[{"userId":"session-user","businessId":"b"}]');
    mocks.create.mockResolvedValue({id:'m'});mocks.source.mockResolvedValue({id:'s'});
    expect(await createEnergyMeasurement(valid)).toEqual({ok:true,data:{id:'m'}});
    expect(await createMeasurementSource({businessId:'b',name:'Meter',sourceType:'METER',measurementBoundary:'WHOLE_SITE',provenanceKey:'meter'})).toEqual({ok:true,data:{id:'s'}});
    expect(mocks.create).toHaveBeenCalledWith('session-user',valid);
    expect(mocks.source).toHaveBeenCalledWith('session-user',expect.objectContaining({businessId:'b'}));
    expect(mocks.entitlements).not.toHaveBeenCalled();
  });
  it('returns structured validation errors, rejects forged identity',async()=>{
    expect(await createEnergyMeasurement({...valid,userId:'attacker'})).toMatchObject({ok:false,error:{code:'VALIDATION_ERROR'}});
    expect(await createEnergyMeasurement({...valid,energyKwh:'NaN'})).toMatchObject({ok:false,error:{code:'VALIDATION_ERROR',issues:[{path:'energyKwh'}]}});
    expect(mocks.entitlements).not.toHaveBeenCalled();
  });
  it('binds reads to session identity, not client input',async()=>{
    mocks.find.mockResolvedValue(null);mocks.list.mockResolvedValue([]);mocks.sources.mockResolvedValue([]);
    expect(await getEnergyMeasurement('m')).toEqual({ok:true,data:null});
    await listEnergyMeasurements({businessId:'b'});await listMeasurementSources('b');
    expect(mocks.find).toHaveBeenCalledWith('session-user','m');
    expect(mocks.list).toHaveBeenCalledWith('session-user',expect.objectContaining({businessId:'b'}));
    expect(mocks.sources).toHaveBeenCalledWith('session-user','b');
  });
  it('sanitizes unexpected infrastructure errors without data leakage',async()=>{
    mocks.find.mockRejectedValue(new Error('postgresql://secret@tenant/private'));
    const result=await getEnergyMeasurement('m');
    expect(result).toMatchObject({ok:false,error:{code:'MEASUREMENT_UNAVAILABLE'}});
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});
