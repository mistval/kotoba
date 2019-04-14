'use strict'

class SettingsOverride {
  constructor(value, overridesServerSetting, overridesUserSetting, minValid, maxValid) {
    this.value_ = value;
    this.overridesServerSetting_ = overridesServerSetting;
    this.overridesUserSetting_ = overridesUserSetting;
    this.minValid_ = minValid;
    this.maxValid_ = maxValid;
  }

  doOverride(serverSetting, userSetting) {
    if (userSetting !== undefined && !Number.isNaN(userSetting)) {
      if (this.overridesUserSetting_) {
        return this.value_;
      }
      return this.coerceToValid_(userSetting);
    }
    if (serverSetting !== undefined) {
      if (this.overridesServerSetting_) {
        return this.value_;
      }
      return serverSetting;
    }
    return this.value_;
  }

  coerceToValid_(value) {
    return Math.min(Math.max(value, this.minValid_), this.maxValid_);
  }
}

module.exports = SettingsOverride;